import { NextResponse, type NextRequest } from "next/server";

function canonicalOrigin() {
  return (process.env.APP_URL || "https://traili.justinyjwang.com").replace(/\/$/, "");
}

/** Production Vercel alias only — not preview URLs like traili-git-main-….vercel.app */
function isProductionVercelHost(host: string) {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return host === prod;
  return host === "traili.vercel.app";
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  const dest = canonicalOrigin();
  let destHost = "";
  try {
    destHost = new URL(dest).host;
  } catch {
    return NextResponse.next();
  }
  if (!host || host === destHost || host.includes("localhost")) return NextResponse.next();
  if (process.env.VERCEL_ENV === "production" && isProductionVercelHost(host)) {
    const url = req.nextUrl.clone();
    return NextResponse.redirect(`${dest}${url.pathname}${url.search}`, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/uploads|favicon.ico|icon.svg|robots.txt).*)"],
};
