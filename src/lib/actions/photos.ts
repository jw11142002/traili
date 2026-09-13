"use server";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getCurrentUser } from "../session";
import { uploadDir } from "../uploads";

const MAX_FILES = 8;
const MAX_BYTES = 15 * 1024 * 1024;

export async function addPhotos(formData: FormData): Promise<{ photos?: { id: string; url: string }[]; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const visitId = String(formData.get("visitId") ?? "");
  const kind = String(formData.get("kind") ?? "visit"); // visit | avatar
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "No photos selected" };

  let trailId: string | null = null;
  if (kind === "visit") {
    const visit = await db.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.userId !== me.id) return { error: "Visit not found" };
    trailId = visit.trailId;
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const out: { id: string; url: string }[] = [];

  for (const file of files.slice(0, MAX_FILES)) {
    if (file.size > MAX_BYTES) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      const size = kind === "avatar" ? 400 : 1600;
      const img = sharp(buf).rotate().resize({ width: size, height: size, fit: kind === "avatar" ? "cover" : "inside", withoutEnlargement: true });
      const { data, info } = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      const name = `${randomUUID()}.webp`;
      await writeFile(path.join(dir, name), data);
      if (kind === "avatar") {
        await db.user.update({ where: { id: me.id }, data: { avatarUrl: `/api/uploads/${name}` } });
        out.push({ id: name, url: `/api/uploads/${name}` });
      } else {
        const photo = await db.photo.create({
          data: { file: name, width: info.width, height: info.height, userId: me.id, trailId, visitId },
        });
        out.push({ id: photo.id, url: `/api/uploads/${name}` });
      }
    } catch {
      // skip unreadable file
    }
  }
  revalidatePath("/", "layout");
  return { photos: out };
}

export async function deletePhoto(photoId: string): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };
  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.userId !== me.id) return { error: "Not yours" };
  await db.photo.delete({ where: { id: photoId } });
  await unlink(path.join(uploadDir(), photo.file)).catch(() => {});
  revalidatePath("/", "layout");
  return {};
}
