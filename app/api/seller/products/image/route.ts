import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getActiveSeller } from "@/lib/supabase/seller-user";

export const runtime = "nodejs";

function resolveImageType(type: string, filename: string): { extension: string; mimeType: string } | null {
  const normalizedType = (type || "").toLowerCase().trim();
  const lowerName = (filename || "").toLowerCase().trim();

  if (normalizedType === "image/jpeg" || normalizedType === "image/jpg" || normalizedType === "image/pjpeg") {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (normalizedType === "image/png" || normalizedType === "image/x-png") {
    return { extension: "png", mimeType: "image/png" };
  }
  if (normalizedType === "image/webp") {
    return { extension: "webp", mimeType: "image/webp" };
  }

  // Fallback to filename extension
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (lowerName.endsWith(".png")) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (lowerName.endsWith(".webp")) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}

export async function POST(request: Request) {
  const seller = await getActiveSeller();
  if (!seller) {
    return NextResponse.json({ error: "Active seller access is required." }, { status: 403 });
  }

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

    // Ensure bucket exists
    try {
      await supabase.storage.createBucket("product-images", { public: true });
    } catch {
      // Bucket already exists
    }

    for (const file of rawFiles) {
      // 10 MB maximum
      if (file.size < 1 || file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `Photo "${file.name}" exceeds the 10 MB limit. Please choose a smaller photo.` }, { status: 400 });
      }

      const resolved = resolveImageType(file.type, file.name);
      if (!resolved) {
        return NextResponse.json({ error: `"${file.name}" must be a JPG, PNG, or WebP photo.` }, { status: 400 });
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      // Unique file path per seller
      const path = `${seller.user.id}/${randomUUID()}.${resolved.extension}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, bytes, {
        contentType: resolved.mimeType,
        cacheControl: "31536000",
        upsert: true,
      });

      if (uploadError) {
        console.error("[image/upload] Supabase storage error:", uploadError);
        throw new Error(uploadError.message || "Could not upload to storage.");
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    return NextResponse.json({
      imageUrl: uploadedUrls[0],
      imageUrls: uploadedUrls,
    });
  } catch (error) {
    console.error("Seller product image upload failed:", error);
    const msg = error instanceof Error ? error.message : "Could not upload photo.";
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }
}
