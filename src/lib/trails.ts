/**
 * Trail discovery on top of OpenStreetMap (Nominatim for search, Overpass for geometry).
 * Global coverage: works for US trails as well as e.g. the Dolomites.
 */

export type TrailKind = "trail" | "route" | "peak" | "lake" | "waterfall" | "viewpoint" | "park" | "hut" | "place";

export type TrailSearchResult = {
  osmType: "node" | "way" | "relation";
  osmId: string;
  name: string;
  kind: TrailKind;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number;
  lng: number;
  distanceKm: number | null;
  subtitle: string;
};

// Nominatim's usage policy requires an identifying User-Agent (they 403 generic/placeholder ones).
const UA = process.env.OSM_USER_AGENT || "traili/0.1 (+https://github.com/jw11142002/traili)";

const PATH_TYPES = new Set(["path", "footway", "track", "steps", "bridleway", "via_ferrata"]);
const ROUTE_TYPES = new Set(["hiking", "foot", "walking", "mtb", "running", "fitness_trail", "nordic_walking"]);
const NATURAL_KINDS: Record<string, TrailKind> = {
  peak: "peak",
  volcano: "peak",
  saddle: "peak",
  ridge: "peak",
  arete: "peak",
  cliff: "viewpoint",
  water: "lake",
  bay: "lake",
  beach: "lake",
  glacier: "peak",
  valley: "place",
  hot_spring: "place",
  cave_entrance: "place",
  wood: "park",
  spring: "place",
  island: "place",
};

function classify(category: string, type: string): TrailKind | null {
  switch (category) {
    case "highway":
      return PATH_TYPES.has(type) ? "trail" : null; // roads are excluded
    case "route":
      return ROUTE_TYPES.has(type) ? "route" : null;
    case "natural":
      if (NATURAL_KINDS[type]) return NATURAL_KINDS[type];
      if (["bare_rock", "rock", "scree", "stone", "cliff", "fell", "moraine"].includes(type)) return "peak";
      if (["heath", "grassland", "scrub", "wetland", "shingle", "sand", "dune", "tree", "tree_row"].includes(type)) return "place";
      return "place";
    case "mountain_pass":
      return "peak";
    case "water":
      return "lake"; // lake, reservoir, pond, river…
    case "waterway":
      return type === "waterfall" ? "waterfall" : ["river", "stream", "canal"].includes(type) ? "place" : null;
    case "landuse":
      return ["reservoir", "forest", "meadow", "basin"].includes(type) ? "place" : null;
    case "leisure":
      return ["nature_reserve", "park", "garden"].includes(type) ? "park" : null;
    case "boundary":
      return ["national_park", "protected_area", "forest", "forest_compartment"].includes(type) ? "park" : null;
    case "tourism":
      if (type === "viewpoint") return "viewpoint";
      if (["alpine_hut", "wilderness_hut", "camp_site", "camp_pitch"].includes(type)) return "hut";
      if (["attraction", "picnic_site", "trail_riding_station"].includes(type)) return "place";
      return null;
    case "amenity":
      return type === "shelter" ? "hut" : null;
    case "place":
      return ["locality", "islet", "island", "hamlet", "isolated_dwelling"].includes(type) ? "place" : null;
    case "geological":
      return "place";
    default:
      return null;
  }
}

const KIND_PRIORITY: Record<TrailKind, number> = {
  trail: 0,
  route: 0,
  peak: 1,
  waterfall: 1,
  lake: 2,
  viewpoint: 2,
  hut: 3,
  park: 3,
  place: 4,
};

export const KIND_LABEL: Record<TrailKind, string> = {
  trail: "Trail",
  route: "Route",
  peak: "Summit",
  lake: "Lake",
  waterfall: "Waterfall",
  viewpoint: "Viewpoint",
  park: "Park",
  hut: "Hut",
  place: "Place",
};

type NominatimHit = {
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  name?: string;
  display_name: string;
  importance?: number;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
  extratags?: Record<string, string>;
};

// --- polite rate limiting (Nominatim asks for max 1 req/s) + a small cache ---
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, lastCall + 1100 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

const cache = new Map<string, { at: number; value: unknown }>();
function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value as T);
  return fn().then((v) => {
    cache.set(key, { at: Date.now(), value: v });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return v;
  });
}

function regionOf(addr: Record<string, string> | undefined) {
  if (!addr) return null;
  return addr.state || addr.province || addr.region || addr.county || addr.state_district || null;
}

function localityOf(addr: Record<string, string> | undefined) {
  if (!addr) return null;
  return addr.city || addr.town || addr.village || addr.municipality || addr.county || null;
}

async function nominatim(params: Record<string, string>): Promise<NominatimHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return (await res.json()) as NominatimHit[];
}

/** Search trails / summits / lakes etc. by free text. */
export async function searchTrails(
  q: string,
  near?: { lat: number; lng: number } | null,
): Promise<TrailSearchResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const key = `t:${query.toLowerCase()}:${near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : ""}`;
  return cached(key, 10 * 60_000, () =>
    throttled(async () => {
      const params: Record<string, string> = { q: query, limit: "30", dedupe: "1" };
      if (near) {
        // Soft bias toward the user's home region (unbounded viewbox = preference, not restriction)
        params.viewbox = `${near.lng - 4},${near.lat + 3},${near.lng + 4},${near.lat - 3}`;
        params.bounded = "0";
      }
      let hits = await nominatim(params);
      // If the bare name mostly matched lakes/peaks/roads, also try "<name> trail" (very common for US trails).
      if (hits.filter((h) => classify(h.category, h.type)).length < 4 && !/\b(trail|path|loop|route|track|weg|sentiero|via)\b/i.test(query)) {
        await new Promise((r) => setTimeout(r, 1100));
        lastCall = Date.now();
        const extra = await nominatim({ ...params, q: `${query} trail` }).catch(() => [] as NominatimHit[]);
        hits = [...extra, ...hits];
      }
      const out: TrailSearchResult[] = [];
      const seen = new Set<string>();
      for (const h of hits) {
        const kind = classify(h.category, h.type);
        if (!kind) continue;
        const name = h.namedetails?.["name:en"] || h.namedetails?.name || h.name || h.display_name.split(",")[0];
        if (!name) continue;
        const region = regionOf(h.address);
        const locality = localityOf(h.address);
        const country = h.address?.country ?? null;
        const parts = [locality && locality !== name ? locality : null, region, country].filter(Boolean);
        // OSM splits long trails into many ways with the same name: collapse them into one result.
        const dedupeKey = `${name.toLowerCase()}|${kind}|${parts.join(",").toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        out.push({
          osmType: h.osm_type,
          osmId: String(h.osm_id),
          name,
          kind,
          region,
          country,
          countryCode: h.address?.country_code?.toUpperCase() ?? null,
          lat: parseFloat(h.lat),
          lng: parseFloat(h.lon),
          distanceKm: null,
          subtitle: Array.from(new Set(parts)).join(", "),
        });
      }
      out.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
      return out.slice(0, 15);
    }),
  );
}

export type PlaceResult = { name: string; subtitle: string; lat: number; lng: number; country: string | null; countryCode: string | null; region: string | null };

/** Search cities / regions / parks — used for home location and manual trail placement. */
export async function searchPlaces(q: string): Promise<PlaceResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  return cached(`p:${query.toLowerCase()}`, 30 * 60_000, () =>
    throttled(async () => {
      const hits = await nominatim({ q: query, limit: "8", featureType: "settlement" }).catch(() => [] as NominatimHit[]);
      const results = hits.length ? hits : await nominatim({ q: query, limit: "8" });
      return results.map((h) => {
        const name = h.namedetails?.["name:en"] || h.name || h.display_name.split(",")[0];
        const region = regionOf(h.address);
        const country = h.address?.country ?? null;
        return {
          name,
          subtitle: [region, country].filter((p) => p && p !== name).join(", "),
          lat: parseFloat(h.lat),
          lng: parseFloat(h.lon),
          country,
          countryCode: h.address?.country_code?.toUpperCase() ?? null,
          region,
        };
      });
    }),
  );
}

// --- Overpass: length of a way / route relation ---

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type OverpassGeom = { lat: number; lon: number };
type OverpassElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeom[];
  members?: { type: string; ref: number; role: string; geometry?: OverpassGeom[] }[];
};

function lengthOf(geometry?: OverpassGeom[]) {
  if (!geometry || geometry.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < geometry.length; i++) {
    km += haversineKm([geometry[i - 1].lat, geometry[i - 1].lon], [geometry[i].lat, geometry[i].lon]);
  }
  return km;
}

/** Best-effort enrichment for an OSM way/relation: total length and tags (route type, difficulty). */
export async function enrichOsm(
  osmType: string,
  osmId: string,
  hint?: { name: string; lat: number; lng: number },
): Promise<{ distanceKm: number | null; routeType: string | null; difficulty: string | null; description: string | null }> {
  const empty = { distanceKm: null, routeType: null, difficulty: null, description: null };
  if (osmType !== "way" && osmType !== "relation") return empty;
  try {
    // A named trail is usually split into many OSM ways. For a way hit, sum every same-named
    // path within a few km so the length reflects the whole trail rather than one segment.
    const q =
      osmType === "way" && hint
        ? `[out:json][timeout:12];(way(${osmId});way["highway"]["name"=${JSON.stringify(hint.name)}](around:4000,${hint.lat},${hint.lng}););out geom;`
        : `[out:json][timeout:12];${osmType}(${osmId});out geom;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: `data=${encodeURIComponent(q)}`,
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as { elements: OverpassElement[] };
    const el = json.elements?.find((e) => String(e.id) === osmId && e.type === osmType) ?? json.elements?.[0];
    if (!el) return empty;
    let km = 0;
    if (el.type === "way") {
      const seen = new Set<number>();
      for (const w of json.elements) {
        if (w.type !== "way" || seen.has(w.id)) continue;
        seen.add(w.id);
        km += lengthOf(w.geometry);
      }
    } else if (el.members) {
      for (const m of el.members) {
        if (m.type !== "way") continue;
        if (m.role && /alternat|excursion|approach|connection|shortcut/i.test(m.role)) continue;
        km += lengthOf(m.geometry);
      }
    }
    const tags = el.tags ?? {};
    const roundtrip = tags.roundtrip === "yes";
    const sac = tags.sac_scale;
    const difficulty = sac
      ? sac === "hiking"
        ? "easy"
        : sac === "mountain_hiking"
          ? "moderate"
          : "hard"
      : null;
    const routeType = roundtrip ? "loop" : el.type === "relation" && tags.route ? "point-to-point" : null;
    return {
      distanceKm: km > 0.2 ? Math.round(km * 10) / 10 : null,
      routeType,
      difficulty,
      description: tags.description || tags["description:en"] || null,
    };
  } catch {
    return empty;
  }
}
