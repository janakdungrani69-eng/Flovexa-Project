import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/admin-user";

export const runtime = "nodejs";

const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/webp": { extension: "webp", signature: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
} as const;

export async function POST(request: Request) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a product photo to upload." }, { status: 400 });
  if (file.size < 1 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Choose an image smaller than 5 MB." }, { status: 400 });
  }

  const imageType = imageTypes[file.type as keyof typeof imageTypes];
  if (!imageType) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType.signature(bytes)) return NextResponse.json({ error: "This file does not match its image format." }, { status: 400 });

  try {
    const supabase = createAdminSupabase();
    const path = `${randomUUID()}.${imageType.extension}`;
    const { error } = await supabase.storage.from("product-images").upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return NextResponse.json({ imageUrl: data.publicUrl });
  } catch (error) {
    console.error("Product image upload failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not upload this image. Confirm the product-images storage bucket is configured." }, { status: 503 });
  }
}
