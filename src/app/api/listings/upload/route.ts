import { NextResponse } from "next/server";

import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { LISTING_IMAGE_ACCEPT } from "@/lib/listing-upload";

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "listing-images";

const extForType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isWalletAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Photo upload is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const ownerAddress = String(form.get("ownerAddress") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }

    if (!isWalletAddress(ownerAddress)) {
      return NextResponse.json(
        { error: "Connect your wallet before uploading." },
        { status: 400 },
      );
    }

    if (!LISTING_IMAGE_ACCEPT.split(",").includes(file.type)) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP photo." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Photo must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    const ext = extForType[file.type] ?? "jpg";
    const objectPath = `${ownerAddress.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      const missingBucket =
        error.message.includes("Bucket not found") ||
        error.message.includes("not found");
      return NextResponse.json(
        {
          error: missingBucket
            ? "Storage bucket missing. Run supabase/listing-images-storage.sql in Supabase."
            : error.message,
        },
        { status: 400 },
      );
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
