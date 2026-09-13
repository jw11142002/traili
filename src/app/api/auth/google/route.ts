import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateCodeVerifier, generateState } from "arctic";
import { googleClient, googleEnabled, requestAppUrl } from "@/lib/google";

export async function GET() {
  const base = await requestAppUrl();
  if (!googleEnabled()) return NextResponse.redirect(`${base}/login?error=google`);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleClient(base).createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("g_state", state, opts);
  jar.set("g_verifier", codeVerifier, opts);
  return NextResponse.redirect(url.toString());
}
