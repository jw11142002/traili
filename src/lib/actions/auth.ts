"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { createSession, destroySession, getCurrentUser } from "../session";
import { applyPendingInvite, INVITE_COOKIE } from "../invites";

export type AuthState = { error?: string } | undefined;

export async function rememberInvite(code: string) {
  const jar = await cookies();
  jar.set(INVITE_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 1) return { error: "Tell us your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
  if (password.length < 8) return { error: "Password needs at least 8 characters." };

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "An account with that email already exists. Try logging in." };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({ data: { name, email, passwordHash } });
  await db.activity.create({ data: { userId: user.id, type: "joined" } });
  await applyPendingInvite(user.id);
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return { error: "No account matches that email and password." };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "No account matches that email and password." };
  await applyPendingInvite(user.id);
  await createSession(user.id);
  redirect(user.onboardedAt ? "/home" : "/onboarding");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/");
}
