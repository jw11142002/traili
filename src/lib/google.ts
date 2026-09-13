import { headers } from "next/headers";
import { Google } from "arctic";

/** Static app URL from env (used where request headers aren't available). */
export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Public URL the current request was served from. Share / invite links must match the
 * host the user is actually on (e.g. traili.vercel.app), not a future custom domain in APP_URL.
 */
export async function requestAppUrl() {
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
