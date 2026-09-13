import { NextResponse, type NextRequest } from "next/server";

function canonicalOrigin() {
  return (process.env.APP_URL || "https://traili.justinyjwang.com").replace(/\/$/, "");
}

export function middleware(req: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") return NextResponse.next();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  let destHost = "";
  const dest = canonicalOrigin();
  try {
    destHost = new URL(dest).host;
  } catch {
    return NextResponse.next();
  }
  if (!host || host === destHost || host.includes("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  return NextResponse.redirect(`${dest}${url.pathname}${url.search}`, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/uploads|favicon.ico|icon.svg|robots.txt).*)"],
};
