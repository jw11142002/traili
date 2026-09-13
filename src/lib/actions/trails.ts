"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getCurrentUser } from "../session";
import { enrichOsm, searchTrails, type TrailSearchResult } from "../trails";
import { inferDifficulty } from "../ranking";

export type TrailHit = TrailSearchResult & {
  trailId: string | null; // already in our DB?
  myScore: number | null;
  wanted: boolean;
};

/** Search OSM and annotate with what we already know (existing trail, my rank, want). */
export async function searchTrailsAction(q: string): Promise<{ results: TrailHit[]; error?: string }> {
  const me = await getCurrentUser();
  const near = me?.homeLat != null && me?.homeLng != null ? { lat: me.homeLat, lng: me.homeLng } : null;
  let results: TrailSearchResult[] = [];
  try {
    results = await searchTrails(q, near);
  } catch {
    return { results: [], error: "Trail search is taking a nap. Try again in a moment." };
  }
  if (results.length === 0) return { results: [] };
  const existing = await db.trail.findMany({
    where: { OR: results.map((r) => ({ osmType: r.osmType, osmId: r.osmId })) },
    select: { id: true, osmType: true, osmId: true, distanceKm: true },
  });
  const byKey = new Map(existing.map((t) => [`${t.osmType}:${t.osmId}`, t]));
  const ids = existing.map((t) => t.id);
  const [ranks, wants] = me
    ? await Promise.all([
        db.userTrailRank.findMany({ where: { userId: me.id, trailId: { in: ids } } }),
        db.want.findMany({ where: { userId: me.id, trailId: { in: ids } } }),
      ])
    : [[], []];
  const rankBy = new Map(ranks.map((r) => [r.trailId, r.score]));
  const wantBy = new Set(wants.map((w) => w.trailId));
  return {
    results: results.map((r) => {
      const t = byKey.get(`${r.osmType}:${r.osmId}`);
      return {
        ...r,
        distanceKm: t?.distanceKm ?? r.distanceKm,
        trailId: t?.id ?? null,
        myScore: t ? (rankBy.get(t.id) ?? null) : null,
        wanted: t ? wantBy.has(t.id) : false,
      };
    }),
  };
}

/** Get-or-create a Trail row from an OSM search hit. Enriches with geometry in the background. */
export async function ensureTrail(hit: TrailSearchResult): Promise<{ trailId: string }> {
  const me = await getCurrentUser();
  const existing = await db.trail.findUnique({ where: { osmType_osmId: { osmType: hit.osmType, osmId: hit.osmId } } });
  if (existing) return { trailId: existing.id };

  // Only paths/routes have a meaningful length; for lakes/peaks/parks the geometry is an outline.
  const enriched =
    hit.kind === "trail" || hit.kind === "route"
      ? await enrichOsm(hit.osmType, hit.osmId, { name: hit.name, lat: hit.lat, lng: hit.lng })
      : { distanceKm: null, routeType: null, difficulty: null, description: null };
  const trail = await db.trail.create({
    data: {
      name: hit.name,
      source: "osm",
      osmType: hit.osmType,
      osmId: hit.osmId,
      kind: hit.kind,
      region: hit.region,
      country: hit.country,
      countryCode: hit.countryCode,
      lat: hit.lat,
      lng: hit.lng,
      distanceKm: enriched.distanceKm,
      routeType: enriched.routeType,
      difficulty: enriched.difficulty ?? inferDifficulty(enriched.distanceKm, null),
      description: enriched.description,
      createdById: me?.id ?? null,
    },
  });
  return { trailId: trail.id };
}

export type ManualTrailInput = {
  name: string;
  lat: number;
  lng: number;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  distanceKm?: number | null;
  elevationGainM?: number | null;
  difficulty?: string | null;
  routeType?: string | null;
};

export async function createManualTrail(input: ManualTrailInput): Promise<{ trailId?: string; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const name = input.name.trim();
  if (name.length < 2) return { error: "Give the trail a name" };
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return { error: "Pick a location" };
  const trail = await db.trail.create({
    data: {
      name: name.slice(0, 120),
      source: "manual",
      kind: "trail",
      lat: input.lat,
      lng: input.lng,
      region: input.region ?? null,
      country: input.country ?? null,
      countryCode: input.countryCode ?? null,
      distanceKm: input.distanceKm ?? null,
      elevationGainM: input.elevationGainM ?? null,
      difficulty: input.difficulty ?? inferDifficulty(input.distanceKm, input.elevationGainM),
      routeType: input.routeType ?? null,
      createdById: me.id,
    },
  });
  return { trailId: trail.id };
}

export async function updateTrailStats(
  trailId: string,
  input: { distanceKm?: number | null; elevationGainM?: number | null; difficulty?: string | null; routeType?: string | null; description?: string | null },
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  await db.trail.update({
    where: { id: trailId },
    data: {
      distanceKm: input.distanceKm === undefined ? undefined : input.distanceKm,
      elevationGainM: input.elevationGainM === undefined ? undefined : input.elevationGainM,
      difficulty: input.difficulty === undefined ? undefined : input.difficulty,
      routeType: input.routeType === undefined ? undefined : input.routeType,
      description: input.description === undefined ? undefined : input.description?.trim().slice(0, 600) || null,
    },
  });
  revalidatePath(`/trails/${trailId}`);
  return {};
}

export async function toggleWant(trailId: string, note?: string): Promise<{ wanted: boolean }> {
  const me = await getCurrentUser();
  if (!me) return { wanted: false };
  const existing = await db.want.findUnique({ where: { userId_trailId: { userId: me.id, trailId } } });
  if (existing) {
    await db.want.delete({ where: { id: existing.id } });
    await db.activity.deleteMany({ where: { userId: me.id, trailId, type: "wanted" } });
    revalidatePath("/lists");
    revalidatePath(`/trails/${trailId}`);
    return { wanted: false };
  }
  await db.want.create({ data: { userId: me.id, trailId, note: note?.trim().slice(0, 140) || null } });
  await db.activity.create({ data: { userId: me.id, trailId, type: "wanted" } });
  revalidatePath("/lists");
  revalidatePath(`/trails/${trailId}`);
  return { wanted: true };
}

export async function updateWantNote(trailId: string, note: string) {
  const me = await getCurrentUser();
  if (!me) return;
  await db.want.updateMany({ where: { userId: me.id, trailId }, data: { note: note.trim().slice(0, 140) || null } });
  revalidatePath("/lists");
}
