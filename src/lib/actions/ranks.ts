"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getCurrentUser } from "../session";
import { bucketForScore, clampScore, needsRespread, respread, scoreForDrop, type Bucket } from "../ranking";

async function rebalanceIfNeeded(userId: string, bucket: Bucket) {
  const rows = await db.userTrailRank.findMany({
    where: { userId, bucket },
    orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
  });
  if (needsRespread(rows)) {
    const spread = respread(rows, bucket);
    await db.$transaction(spread.map((r) => db.userTrailRank.update({ where: { id: r.id }, data: { score: r.score } })));
  }
}

/** Drag-and-drop: place `rankId` between `aboveId` and `belowId` (either may be null). */
export async function moveRank(rankId: string, aboveId: string | null, belowId: string | null): Promise<{ score?: number; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const [item, above, below] = await Promise.all([
    db.userTrailRank.findUnique({ where: { id: rankId } }),
    aboveId ? db.userTrailRank.findUnique({ where: { id: aboveId } }) : null,
    belowId ? db.userTrailRank.findUnique({ where: { id: belowId } }) : null,
  ]);
  if (!item || item.userId !== me.id) return { error: "Not yours" };
  const score = scoreForDrop(above?.score ?? null, below?.score ?? null);
  const bucket = bucketForScore(score);
  await db.userTrailRank.update({ where: { id: rankId }, data: { score, bucket } });
  await rebalanceIfNeeded(me.id, bucket);
  if (bucket !== item.bucket) await rebalanceIfNeeded(me.id, item.bucket as Bucket);
  revalidatePath("/lists");
  revalidatePath(`/trails/${item.trailId}`);
  return { score };
}

/** Direct score nudge, e.g. 9.5 -> 9.3. Crossing a neighbour moves the rank. */
export async function setScore(rankId: string, rawScore: number): Promise<{ score?: number; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const item = await db.userTrailRank.findUnique({ where: { id: rankId } });
  if (!item || item.userId !== me.id) return { error: "Not yours" };
  if (!Number.isFinite(rawScore)) return { error: "Enter a number between 1 and 10" };
  const score = clampScore(rawScore);
  const bucket = bucketForScore(score);
  await db.userTrailRank.update({ where: { id: rankId }, data: { score, bucket } });
  revalidatePath("/lists");
  revalidatePath(`/trails/${item.trailId}`);
  return { score };
}

export async function removeRank(rankId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const item = await db.userTrailRank.findUnique({ where: { id: rankId } });
  if (!item || item.userId !== me.id) return { error: "Not yours" };
  await db.$transaction([
    db.visit.deleteMany({ where: { userId: me.id, trailId: item.trailId } }),
    db.activity.deleteMany({ where: { userId: me.id, trailId: item.trailId, type: { in: ["ranked", "reranked", "revisited"] } } }),
    db.userTrailRank.delete({ where: { id: rankId } }),
  ]);
  revalidatePath("/", "layout");
  return {};
}
