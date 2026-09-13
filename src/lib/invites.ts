import { cookies } from "next/headers";
import { db } from "./db";

export const INVITE_COOKIE = "traili_invite";

/** If the user arrived via someone's invite link, make them friends automatically. */
export async function applyPendingInvite(userId: string) {
  const jar = await cookies();
  const code = jar.get(INVITE_COOKIE)?.value;
  if (!code) return;
  jar.delete(INVITE_COOKIE);
  const inviter = await db.user.findUnique({ where: { inviteCode: code } });
  if (!inviter || inviter.id === userId) return;
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: inviter.id, addresseeId: userId },
        { requesterId: userId, addresseeId: inviter.id },
      ],
    },
  });
  if (existing) {
    if (existing.status !== "accepted") await db.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    return;
  }
  await db.friendship.create({ data: { requesterId: inviter.id, addresseeId: userId, status: "accepted" } });
}
