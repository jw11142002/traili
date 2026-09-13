import { headers } from "next/headers";
import { Google } from "arctic";

/** Static app URL from env (used where request headers aren't available). */
export function appUrl() {
  return (process.env.APP_URL || "https://traili.justinyjwang.com").replace(/\/$/, "");
}

/**
 * Canonical public URL for invite / share links.
 * Prefer APP_URL when it is a real domain (https://traili.justinyjwang.com); otherwise
 * use the request host so local / preview deploys still produce working links.
 */
export async function requestAppUrl() {
  const env = process.env.APP_URL?.replace(/\/$/, "");
  if (env && /^https:\/\//i.test(env) && !/localhost|127\.0\.0\.1/.test(env)) return env;
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host"))?.split(",")[0]?.trim();
    if (host) {
      const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* outside a request scope */
  }
  return appUrl();
}

export function googleEnabled() {
  // Email/password only for now. Flip this back on once Google OAuth is configured.
  return false;
}

export function googleClient(base: string) {
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${base}/api/auth/google/callback`);
}
