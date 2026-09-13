"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getCurrentUser } from "../session";
import { getFriendIds, type FriendState } from "../queries";

export type UserCard = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  homePlace: string | null;
  hikes: number;
  state: FriendState;
};

export async function searchUsers(q: string): Promise<UserCard[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const query = q.trim().replace(/^@/, "");
  if (query.length < 2) return [];
  const users = await db.user.findMany({
    where: {
      id: { not: me.id },
      onboardedAt: { not: null },
      OR: [{ username: { contains: query } }, { name: { contains: query } }, { email: query.toLowerCase() }],
    },
    take: 12,
    include: { _count: { select: { ranks: true } } },
  });
  const rels = await db.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
  });
  return users.map((u) => {
    const rel = rels.find((r) => (r.requesterId === me.id && r.addresseeId === u.id) || (r.addresseeId === me.id && r.requesterId === u.id));
    let state: FriendState = "none";
    if (rel) state = rel.status === "accepted" ? "friends" : rel.requesterId === me.id ? "outgoing" : "incoming";
    return { id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl, homePlace: u.homePlace, hikes: u._count.ranks, state };
  });
}

export async function sendFriendRequest(userId: string): Promise<{ state: FriendState; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { state: "none", error: "Not signed in" };
  if (userId === me.id) return { state: "self" };
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me.id, addresseeId: userId },
        { requesterId: userId, addresseeId: me.id },
      ],
    },
  });
  if (existing) {
    if (existing.status === "accepted") return { state: "friends" };
    if (existing.requesterId === userId) {
      await db.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
      revalidatePath("/", "layout");
      return { state: "friends" };
    }
    return { state: "outgoing" };
  }
  await db.friendship.create({ data: { requesterId: me.id, addresseeId: userId, status: "pending" } });
  revalidatePath("/friends");
  return { state: "outgoing" };
}

export async function respondToRequest(userId: string, accept: boolean): Promise<{ state: FriendState }> {
  const me = await getCurrentUser();
  if (!me) return { state: "none" };
  const req = await db.friendship.findFirst({ where: { requesterId: userId, addresseeId: me.id, status: "pending" } });
  if (!req) return { state: "none" };
  if (accept) await db.friendship.update({ where: { id: req.id }, data: { status: "accepted" } });
  else await db.friendship.delete({ where: { id: req.id } });
  revalidatePath("/", "layout");
  return { state: accept ? "friends" : "none" };
}

export async function removeFriend(userId: string): Promise<{ state: FriendState }> {
  const me = await getCurrentUser();
  if (!me) return { state: "none" };
  await db.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: me.id, addresseeId: userId },
        { requesterId: userId, addresseeId: me.id },
      ],
    },
  });
  revalidatePath("/", "layout");
  return { state: "none" };
}

export async function getFriendsForUser(userId: string) {
  const ids = await getFriendIds(userId);
  return db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true, avatarUrl: true }, orderBy: { name: "asc" } });
}
