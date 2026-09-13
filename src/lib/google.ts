import { headers } from "next/headers";
import { Google } from "arctic";

/** Static app URL from env (used where request headers aren't available). */
export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Public URL the current request was served from. Prefers APP_URL when it is set to a real
 * domain; otherwise derives it from the request (works behind tunnels / reverse proxies).
 */
export async function requestAppUrl() {
  const env = process.env.APP_URL?.replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* outside a request scope */
  }
  return appUrl();
}

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleClient(base: string) {
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${base}/api/auth/google/callback`);
}
