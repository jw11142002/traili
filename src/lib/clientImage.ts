"use client";

/**
 * Downscale an image in the browser before uploading. Serverless request bodies are
 * capped (~4.5 MB on Vercel) and phone photos are often 5–12 MB, so we resize to at most
 * `maxEdge` px and re-encode as JPEG. EXIF orientation is honoured by the browser decoder.
 * Falls back to the original file if anything goes wrong (e.g. HEIC on an old browser).
 */
export async function shrinkImage(file: File, maxEdge = 2000, quality = 0.86): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 1_500_000 && file.type !== "image/heic" && file.type !== "image/heif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}