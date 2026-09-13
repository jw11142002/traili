/**
 * Beli-style ranking.
 *
 * 1. The user picks a sentiment bucket for a hike (liked / fine / disliked).
 * 2. Inside that bucket, we binary-search against *similar* hikes (same effort band)
 *    with "which did you prefer?" prompts. ~log2(n) comparisons.
 * 3. The new hike gets a score between its neighbours. Scores live in fixed
 *    bucket ranges so a "liked" hike is always above a "fine" one.
 * 4. Rank = position in the whole list sorted by score. Dragging or nudging a score
 *    simply rewrites the score; if it crosses a neighbour the rank moves too.
 */

export type Bucket = "liked" | "fine" | "disliked";

export const BUCKETS: Record<Bucket, { top: number; bottom: number; label: string; emoji: string; blurb: string }> = {
  liked: { top: 10, bottom: 7, label: "Loved it", emoji: "🌲", blurb: "I'd tell a friend to go" },
  fine: { top: 6.9, bottom: 4, label: "It was fine", emoji: "🌤️", blurb: "Glad I went, wouldn't rush back" },
  disliked: { top: 3.9, bottom: 1, label: "Not for me", emoji: "🪨", blurb: "Skip it" },
};

export const MIN_GAP = 0.05;

export function bucketForScore(score: number): Bucket {
  if (score >= 7) return "liked";
  if (score >= 4) return "fine";
  return "disliked";
}

export function clampScore(score: number) {
  return Math.min(10, Math.max(1, Math.round(score * 100) / 100));
}

export function formatScore(score: number) {
  return (Math.round(score * 10) / 10).toFixed(1);
}

export function scoreTone(score: number): "liked" | "fine" | "disliked" {
  return bucketForScore(score);
}

export type RankedItem = { id: string; score: number; bucket: Bucket; difficulty?: string | null };

/** Evenly re-spread a bucket's scores preserving order (called when scores collide). */
export function respread<T extends { score: number }>(items: T[], bucket: Bucket): T[] {
  const { top, bottom } = BUCKETS[bucket];
  const n = items.length;
  if (n === 0) return items;
  return items.map((it, i) => ({ ...it, score: clampScore(top - ((top - bottom) * (i + 0.5)) / n) }));
}

/** Returns true if any two neighbouring items in this sorted list are too close. */
export function needsRespread(sorted: { score: number }[]) {
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].score - sorted[i].score < MIN_GAP) return true;
  }
  return false;
}

/**
 * Compute the score for a new item placed at `index` among `similar` (sorted desc).
 * index = 0 means it beat everything; index = similar.length means it lost to all.
 */
export function scoreForInsert(similar: { score: number }[], index: number, bucket: Bucket): number {
  const { top, bottom } = BUCKETS[bucket];
  if (similar.length === 0) return clampScore((top + bottom) / 2);
  const above = index > 0 ? similar[index - 1].score : null;
  const below = index < similar.length ? similar[index].score : null;
  if (above !== null && below !== null) return clampScore((above + below) / 2);
  if (above === null && below !== null) return clampScore((top + below) / 2);
  if (above !== null && below === null) return clampScore((above + bottom) / 2);
  return clampScore((top + bottom) / 2);
}

/** Score for an item dropped between `above` and `below` in the full list. */
export function scoreForDrop(above: number | null, below: number | null): number {
  if (above !== null && below !== null) return clampScore((above + below) / 2);
  if (above === null && below !== null) return clampScore(Math.min(10, below + 0.3));
  if (above !== null && below === null) return clampScore(Math.max(1, above - 0.3));
  return 5.5;
}

export function effortBand(difficulty?: string | null): "easy" | "moderate" | "hard" {
  if (difficulty === "easy" || difficulty === "hard") return difficulty;
  return "moderate";
}

/** Infer effort band from stats if we have them. */
export function inferDifficulty(distanceKm?: number | null, gainM?: number | null): "easy" | "moderate" | "hard" | null {
  if (distanceKm == null && gainM == null) return null;
  const d = distanceKm ?? 0;
  const g = gainM ?? 0;
  const effortScore = d + g / 100; // ~1 km per 100 m of climbing
  if (effortScore < 7) return "easy";
  if (effortScore < 16) return "moderate";
  return "hard";
}
