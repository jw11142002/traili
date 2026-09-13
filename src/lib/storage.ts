import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { uploadDir } from "./uploads";

/**
 * Photo storage. Uses Supabase Storage (public bucket) when SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are set — required on Vercel, whose filesystem is
 * read-only/ephemeral. Falls back to the local disk otherwise.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "photos";

function supabase() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function storageIsRemote() {
  return supabase() !== null;
}

/** Public URL for an object, or null when stored locally (served by /api/uploads). */
export function objectPublicUrl(name: string): string | null {
  const sb = supabase();
  return sb ? `${sb.url}/storage/v1/object/public/${BUCKET}/${name}` : null;
}

let bucketReady: Promise<void> | null = null;
function ensureBucket(sb: { url: string; key: string }) {
  bucketReady ??= (async () => {
    const res = await fetch(`${sb.url}/storage/v1/bucket`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key, "Content-Type": "application/json" },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 20 * 1024 * 1024 }),
    });
    // 409 = already exists; anything else other than 2xx is a real problem.
    if (!res.ok && res.status !== 409 && res.status !== 400) {
      bucketReady = null;
      throw new Error(`Could not create storage bucket (${res.status}): ${await res.text()}`);
    }
  })();
  return bucketReady;
}

export async function putObject(name: string, data: Buffer, contentType: string) {
  const sb = supabase();
  if (!sb) {
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), data);
    return;
  }
  await ensureBucket(sb);
  const res = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sb.key}`,
      apikey: sb.key,
      "Content-Type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-upsert": "true",
    },
    body: new Uint8Array(data),
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
}

export async function deleteObject(name: string) {
  const sb = supabase();
  if (!sb) {
    await unlink(path.join(uploadDir(), name)).catch(() => {});
    return;
  }
  await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key },
  }).catch(() => {});
}

/** Local-only: read an object from disk (used by /api/uploads when not on Supabase). */
export async function readLocalObject(name: string) {
  return readFile(path.join(uploadDir(), name));
}
