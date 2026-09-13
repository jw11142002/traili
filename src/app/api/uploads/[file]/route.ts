import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadDir } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^[a-f0-9-]+\.webp$/i.test(file)) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(uploadDir(), file));
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
