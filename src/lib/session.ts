import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { db } from "./db";

export const SESSION_COOKIE = "traili_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (Boolean(process.env.VERCEL) || (process.env.APP_URL ?? "").startsWith("https")),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    await db.session.deleteMany({ where: { id } });
    jar.delete(SESSION_COOKIE);
  }
}

/** Current user or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Requires a logged-in user; redirects to login otherwise. */
export async function requireUser(opts: { allowUnonboarded?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!opts.allowUnonboarded && !user.onboardedAt) redirect("/onboarding");
  return user;
}
