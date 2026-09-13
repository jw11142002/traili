import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { INVITE_COOKIE } from "@/lib/invites";

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const to = req.nextUrl.searchParams.get("to") === "login" ? "/login" : "/signup";
  const jar = await cookies();
  jar.set(INVITE_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.redirect(new URL(to, req.url));
}
