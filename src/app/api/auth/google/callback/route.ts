import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";
import { db } from "@/lib/db";
import { googleClient, googleEnabled, requestAppUrl } from "@/lib/google";
import { createSession } from "@/lib/session";
import { applyPendingInvite } from "@/lib/invites";

export async function GET(req: NextRequest) {
  const base = await requestAppUrl();
  if (!googleEnabled()) return NextResponse.redirect(`${base}/login?error=google`);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const storedState = jar.get("g_state")?.value;
  const verifier = jar.get("g_verifier")?.value;
  jar.delete("g_state");
  jar.delete("g_verifier");
  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return NextResponse.redirect(`${base}/login?error=google_state`);
  }

  try {
    const tokens = await googleClient(base).validateAuthorizationCode(code, verifier);
    const claims = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; name?: string; picture?: string; email_verified?: boolean };
    const email = claims.email?.toLowerCase();
    if (!email) return NextResponse.redirect(`${base}/login?error=google_email`);

    let user = await db.user.findUnique({ where: { googleId: claims.sub } });
    if (!user) {
      const byEmail = await db.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await db.user.update({ where: { id: byEmail.id }, data: { googleId: claims.sub, avatarUrl: byEmail.avatarUrl ?? claims.picture ?? null } });
      } else {
        user = await db.user.create({
          data: { email, googleId: claims.sub, name: claims.name || email.split("@")[0], avatarUrl: claims.picture ?? null },
        });
        await db.activity.create({ data: { userId: user.id, type: "joined" } });
      }
    }
    await applyPendingInvite(user.id);
    await createSession(user.id);
    return NextResponse.redirect(`${base}${user.onboardedAt ? "/home" : "/onboarding"}`);
  } catch {
    return NextResponse.redirect(`${base}/login?error=google_failed`);
  }
}
