"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getCurrentUser } from "../session";
import { slugifyUsername } from "../format";
import { searchPlaces, type PlaceResult } from "../trails";

const RESERVED = new Set(["admin", "traili", "home", "search", "log", "lists", "friends", "settings", "trails", "u", "api", "login", "signup", "invite", "onboarding"]);

export async function checkUsername(raw: string): Promise<{ ok: boolean; reason?: string; value: string }> {
  const me = await getCurrentUser();
  const value = slugifyUsername(raw);
  if (value.length < 3) return { ok: false, reason: "At least 3 characters", value };
  if (RESERVED.has(value)) return { ok: false, reason: "That one's taken", value };
  const existing = await db.user.findUnique({ where: { username: value } });
  if (existing && existing.id !== me?.id) return { ok: false, reason: "That one's taken", value };
  return { ok: true, value };
}

export async function suggestUsername(name: string) {
  const base = slugifyUsername(name.replace(/\s+/g, "")) || "hiker";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 900 + 100)}`;
    if (RESERVED.has(candidate)) continue;
    const exists = await db.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `${base}${Date.now() % 10000}`;
}

export type ProfileInput = {
  name?: string;
  username?: string;
  bio?: string;
  homePlace?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  tastes?: string[];
  comfort?: string | null;
};

export async function updateProfile(input: ProfileInput): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) return { error: "Name can't be empty" };
    data.name = n.slice(0, 60);
  }
  if (input.username !== undefined) {
    const check = await checkUsername(input.username);
    if (!check.ok) return { error: check.reason };
    data.username = check.value;
  }
  if (input.bio !== undefined) data.bio = input.bio.trim().slice(0, 200) || null;
  if (input.homePlace !== undefined) {
    data.homePlace = input.homePlace;
    data.homeLat = input.homeLat ?? null;
    data.homeLng = input.homeLng ?? null;
  }
  if (input.tastes !== undefined) data.tastes = JSON.stringify(input.tastes.slice(0, 20));
  if (input.comfort !== undefined) data.comfort = input.comfort;
  await db.user.update({ where: { id: me.id }, data });
  revalidatePath("/", "layout");
  return {};
}

export async function completeOnboarding(): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  if (!me.username) {
    const username = await suggestUsername(me.name);
    await db.user.update({ where: { id: me.id }, data: { username, onboardedAt: new Date() } });
  } else {
    await db.user.update({ where: { id: me.id }, data: { onboardedAt: new Date() } });
  }
  revalidatePath("/", "layout");
  return {};
}

export async function findPlaces(q: string): Promise<PlaceResult[]> {
  try {
    return await searchPlaces(q);
  } catch {
    return [];
  }
}
