const MAX_BYTES = 5 * 1024 * 1024;

export const LISTING_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateListingImageFile(file: File): string | null {
  if (!LISTING_IMAGE_ACCEPT.split(",").includes(file.type)) {
    return "Use a JPG, PNG, or WebP photo.";
  }
  if (file.size > MAX_BYTES) {
    return "Photo must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadListingImage(
  file: File,
  ownerAddress: string,
): Promise<string> {
  const validation = validateListingImageFile(file);
  if (validation) throw new Error(validation);

  const form = new FormData();
  form.append("file", file);
  form.append("ownerAddress", ownerAddress);

  const res = await fetch("/api/listings/upload", {
    method: "POST",
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Could not upload photo");
  }

  if (!data.url) {
    throw new Error("Upload succeeded but no image URL was returned");
  }

  return data.url;
}
