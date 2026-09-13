"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getCurrentUser } from "../session";
import { BUCKETS, type Bucket, effortBand, needsRespread, respread, scoreForInsert } from "../ranking";
import { getRankedList } from "../queries";

export type Candidate = {
  rankId: string;
  trailId: string;
  name: string;
  region: string | null;
  country: string | null;
  score: number;
  photo: string | null;
  distanceKm: number | null;
  kind: string | null;
};

export type StartRankingResult = {
  candidates: Candidate[];
  usedFallback: boolean;
  existing: { score: number; bucket: Bucket } | null;
};

/** Build the comparison set: same bucket, similar effort. Falls back to the whole bucket. */
export async function startRanking(trailId: string, bucket: Bucket, effort: string): Promise<StartRankingResult> {
  const me = await getCurrentUser();
  if (!me) return { candidates: [], usedFallback: false, existing: null };
  const ranks = await db.userTrailRank.findMany({
    where: { userId: me.id, bucket, trailId: { not: trailId } },
    include: { trail: { include: { photos: { take: 1, orderBy: { createdAt: "desc" } } } } },
    orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
  });
  const existingRank = await db.userTrailRank.findUnique({ where: { userId_trailId: { userId: me.id, trailId } } });
  const band = effortBand(effort);
  let list = ranks.filter((r) => effortBand(r.trail.difficulty) === band);
  let usedFallback = false;
  if (list.length === 0) {
    list = ranks;
    usedFallback = ranks.length > 0;
  }
  return {
    candidates: list.map((r) => ({
      rankId: r.id,
      trailId: r.trailId,
      name: r.trail.name,
      region: r.trail.region,
      country: r.trail.country,
      score: r.score,
      photo: r.trail.photos[0] ? `/api/uploads/${r.trail.photos[0].file}` : null,
      distanceKm: r.trail.distanceKm,
      kind: r.trail.kind,
    })),
    usedFallback,
    existing: existingRank ? { score: existingRank.score, bucket: existingRank.bucket as Bucket } : null,
  };
}

export type VisitInput = {
  date: string; // yyyy-mm-dd
  effort: string;
  conditions: string[];
  companions: string[];
  crowd: string | null;
  wouldRepeat: string | null;
  notes?: string;
};

export type CommitInput = {
  trailId: string;
  bucket: Bucket;
  candidateRankIds: string[]; // the ordered list the client binary-searched
  insertIndex: number; // 0 = above all candidates
  visit: VisitInput;
  /** When true (re-hike) we only log the visit and keep the current rank. */
  keepExistingRank?: boolean;
};

export type CommitResult = {
  visitId: string;
  rankId: string;
  score: number;
  position: number;
  total: number;
  above: { name: string; score: number } | null;
  below: { name: string; score: number } | null;
  error?: string;
};

function parseDate(s: string) {
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function commitLog(input: CommitInput): Promise<CommitResult | { error: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const trail = await db.trail.findUnique({ where: { id: input.trailId } });
  if (!trail) return { error: "Trail not found" };
  if (!BUCKETS[input.bucket]) return { error: "Pick how you felt about it" };

  const existing = await db.userTrailRank.findUnique({ where: { userId_trailId: { userId: me.id, trailId: trail.id } } });

  // Record the visit.
  const visit = await db.visit.create({
    data: {
      userId: me.id,
      trailId: trail.id,
      date: parseDate(input.visit.date),
      effort: input.visit.effort,
      conditions: JSON.stringify(input.visit.conditions ?? []),
      companions: JSON.stringify(input.visit.companions ?? []),
      crowd: input.visit.crowd,
      wouldRepeat: input.visit.wouldRepeat,
      notes: input.visit.notes?.trim() || null,
    },
  });

  // Learn the trail's effort band from the first person who logs it (a human beats our distance-based guess).
  if (input.visit.effort) {
    const othersVisits = await db.visit.count({ where: { trailId: trail.id, userId: { not: me.id } } });
    if (!trail.difficulty || othersVisits === 0) {
      await db.trail.update({ where: { id: trail.id }, data: { difficulty: effortBand(input.visit.effort) } });
    }
  }

  let rankId: string;
  if (existing && input.keepExistingRank) {
    rankId = existing.id;
    await db.activity.create({ data: { userId: me.id, trailId: trail.id, visitId: visit.id, type: "revisited", meta: JSON.stringify({ score: existing.score }) } });
  } else {
    // Compute the score from the candidates the user actually compared against.
    const candidates = input.candidateRankIds.length
      ? await db.userTrailRank.findMany({ where: { id: { in: input.candidateRankIds }, userId: me.id } })
      : [];
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const ordered = input.candidateRankIds.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
    const idx = Math.max(0, Math.min(ordered.length, input.insertIndex));
    const score = scoreForInsert(ordered, idx, input.bucket);

    const rank = existing
      ? await db.userTrailRank.update({ where: { id: existing.id }, data: { score, bucket: input.bucket } })
      : await db.userTrailRank.create({ data: { userId: me.id, trailId: trail.id, score, bucket: input.bucket } });
    rankId = rank.id;

    // Keep scores from colliding: respread the bucket if two neighbours got too close.
    const bucketRows = await db.userTrailRank.findMany({
      where: { userId: me.id, bucket: input.bucket },
      orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
    });
    if (needsRespread(bucketRows)) {
      const spread = respread(bucketRows, input.bucket);
      await db.$transaction(spread.map((r) => db.userTrailRank.update({ where: { id: r.id }, data: { score: r.score } })));
    }

    const list = await getRankedList(me.id);
    const pos = list.findIndex((r) => r.id === rankId);
    await db.activity.create({
      data: {
        userId: me.id,
        trailId: trail.id,
        visitId: visit.id,
        type: existing ? "reranked" : "ranked",
        meta: JSON.stringify({ score: list[pos]?.score ?? score, position: pos + 1, total: list.length, bucket: input.bucket }),
      },
    });
  }

  const list = await getRankedList(me.id);
  const pos = list.findIndex((r) => r.id === rankId);
  const me2 = list[pos];
  revalidatePath("/", "layout");
  return {
    visitId: visit.id,
    rankId,
    score: me2.score,
    position: pos + 1,
    total: list.length,
    above: pos > 0 ? { name: list[pos - 1].trail.name, score: list[pos - 1].score } : null,
    below: pos < list.length - 1 ? { name: list[pos + 1].trail.name, score: list[pos + 1].score } : null,
  };
}

export async function updateVisit(
  visitId: string,
  input: { notes?: string; date?: string; conditions?: string[]; companions?: string[]; crowd?: string | null; wouldRepeat?: string | null },
): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const visit = await db.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.userId !== me.id) return { error: "Not your visit" };
  await db.visit.update({
    where: { id: visitId },
    data: {
      notes: input.notes === undefined ? undefined : input.notes.trim().slice(0, 2000) || null,
      date: input.date === undefined ? undefined : parseDate(input.date),
      conditions: input.conditions === undefined ? undefined : JSON.stringify(input.conditions),
      companions: input.companions === undefined ? undefined : JSON.stringify(input.companions),
      crowd: input.crowd === undefined ? undefined : input.crowd,
      wouldRepeat: input.wouldRepeat === undefined ? undefined : input.wouldRepeat,
    },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteVisit(visitId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const visit = await db.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.userId !== me.id) return { error: "Not your visit" };
  await db.visit.delete({ where: { id: visitId } });
  const remaining = await db.visit.count({ where: { userId: me.id, trailId: visit.trailId } });
  if (remaining === 0) {
    await db.userTrailRank.deleteMany({ where: { userId: me.id, trailId: visit.trailId } });
    await db.activity.deleteMany({ where: { userId: me.id, trailId: visit.trailId, type: { in: ["ranked", "reranked"] } } });
  }
  revalidatePath("/", "layout");
  return {};
}
