import { NextResponse } from "next/server";
import { objectPublicUrl, readLocalObject } from "@/lib/storage";

/**
 * Serves uploaded photos. On Supabase Storage this is a cached redirect to the
 * public object URL; locally it streams the file from disk.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^[a-f0-9-]+\.webp$/i.test(file)) return new NextResponse("Not found", { status: 404 });

  const remote = objectPublicUrl(file);
  if (remote) {
    return NextResponse.redirect(remote, {
      status: 308,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  try {
    const buf = await readLocalObject(file);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
