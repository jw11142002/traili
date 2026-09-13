import { db } from "./db";
import type { Bucket } from "./ranking";

export async function getRankedList(userId: string) {
  const ranks = await db.userTrailRank.findMany({
    where: { userId },
    include: { trail: { include: { photos: { take: 1, orderBy: { createdAt: "desc" } } } } },
    orderBy: [{ score: "desc" }, { updatedAt: "asc" }],
  });
  return ranks.map((r, i) => ({ ...r, bucket: r.bucket as Bucket, position: i + 1 }));
}

export async function getRankPosition(userId: string, trailId: string) {
  const list = await getRankedList(userId);
  const idx = list.findIndex((r) => r.trailId === trailId);
  return idx === -1 ? null : { position: idx + 1, total: list.length, item: list[idx] };
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await db.friendship.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export type FriendState = "none" | "friends" | "outgoing" | "incoming" | "self";

export async function getFriendState(meId: string, otherId: string): Promise<FriendState> {
  if (meId === otherId) return "self";
  const row = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: meId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: meId },
      ],
    },
  });
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  return row.requesterId === meId ? "outgoing" : "incoming";
}

export async function getPendingRequestCount(userId: string) {
  return db.friendship.count({ where: { addresseeId: userId, status: "pending" } });
}

export async function getFeed(userId: string, limit = 40) {
  const friendIds = await getFriendIds(userId);
  const activities = await db.activity.findMany({
    where: { userId: { in: [userId, ...friendIds] } },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      trail: { select: { id: true, name: true, region: true, country: true, kind: true } },
      visit: { include: { photos: { take: 4, orderBy: { createdAt: "asc" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return activities;
}

export async function getUserStats(userId: string) {
  const [visits, ranks, wants, friends] = await Promise.all([
    db.visit.findMany({ where: { userId }, include: { trail: { select: { distanceKm: true, elevationGainM: true, country: true, region: true } } } }),
    db.userTrailRank.count({ where: { userId } }),
    db.want.count({ where: { userId } }),
    getFriendIds(userId),
  ]);
  const distanceKm = visits.reduce((s, v) => s + (v.trail.distanceKm ?? 0), 0);
  const gainM = visits.reduce((s, v) => s + (v.trail.elevationGainM ?? 0), 0);
  const countries = new Set(visits.map((v) => v.trail.country).filter(Boolean));
  const regions = new Set(visits.map((v) => v.trail.region).filter(Boolean));
  return {
    hikes: ranks,
    visits: visits.length,
    wants,
    friends: friends.length,
    distanceKm,
    gainM,
    countries: countries.size,
    regions: regions.size,
  };
}

/** Friends' highly ranked hikes that the user hasn't done yet. */
export async function getFriendRecommendations(userId: string, limit = 12) {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];
  const mine = await db.userTrailRank.findMany({ where: { userId }, select: { trailId: true } });
  const done = new Set(mine.map((m) => m.trailId));
  const ranks = await db.userTrailRank.findMany({
    where: { userId: { in: friendIds }, score: { gte: 7 } },
    include: {
      trail: { include: { photos: { take: 1, orderBy: { createdAt: "desc" } } } },
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { score: "desc" },
    take: 60,
  });
  const byTrail = new Map<string, { trail: (typeof ranks)[number]["trail"]; fans: (typeof ranks)[number]["user"][]; best: number; avg: number }>();
  for (const r of ranks) {
    if (done.has(r.trailId)) continue;
    const cur = byTrail.get(r.trailId);
    if (cur) {
      cur.fans.push(r.user);
      cur.best = Math.max(cur.best, r.score);
      cur.avg = (cur.avg * (cur.fans.length - 1) + r.score) / cur.fans.length;
    } else byTrail.set(r.trailId, { trail: r.trail, fans: [r.user], best: r.score, avg: r.score });
  }
  return Array.from(byTrail.values())
    .sort((a, b) => b.fans.length - a.fans.length || b.avg - a.avg)
    .slice(0, limit);
}
