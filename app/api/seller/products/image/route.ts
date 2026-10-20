import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getActiveSeller } from "@/lib/supabase/seller-user";

export const runtime = "nodejs";

const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/webp": { extension: "webp", signature: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
} as const;

export async function POST(request: Request) {
  const seller = await getActiveSeller();
  if (!seller) return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });

  try {
    const form = await request.formData();
    // Support multiple files from 'images' or 'image'
    const rawFiles = [...form.getAll("images"), ...form.getAll("image")].filter(
      (item): item is File => item instanceof File
    );

    if (rawFiles.length === 0) {
      return NextResponse.json({ error: "Choose at least one product photo to upload." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const uploadedUrls: string[] = [];

    for (const file of rawFiles) {
      if (file.size < 1 || file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File "${file.name}" exceeds the 10 MB size limit.` }, { status: 400 });
      }
      const imageType = imageTypes[file.type as keyof typeof imageTypes];
      if (!imageType) {
        return NextResponse.json({ error: `"${file.name}" must be a JPG, PNG, or WebP image.` }, { status: 400 });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!imageType.signature(bytes)) {
        return NextResponse.json({ error: `"${file.name}" does not match valid image signature.` }, { status: 400 });
      }

      const path = `${seller.user.id}/${randomUUID()}.${imageType.extension}`;
      const { error } = await supabase.storage.from("product-images").upload(path, bytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    return NextResponse.json({
      imageUrl: uploadedUrls[0],
      imageUrls: uploadedUrls,
    });
  } catch (error) {
    console.error("Seller product image upload failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not upload images. Confirm product-images storage bucket is active." }, { status: 503 });
  }
}