const OPTIMIZED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "picsum.photos",
  "fastly.picsum.photos",
  "drive.google.com",
  "lh3.googleusercontent.com",
  "docs.google.com",
]);

/** Extract Google Drive file id from share / open links */
function googleDriveFileId(url: URL): string | null {
  const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (pathMatch?.[1]) return pathMatch[1];

  const id = url.searchParams.get("id");
  if (id) return id;

  return null;
}

/**
 * Turns share links (Google Drive, etc.) into direct image URLs when possible.
 */
export function normalizeImageUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);

    if (url.hostname === "drive.google.com" || url.hostname === "docs.google.com") {
      const fileId = googleDriveFileId(url);
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
      }
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

export function isOptimizableImageUrl(input: string): boolean {
  try {
    const url = new URL(normalizeImageUrl(input));
    return OPTIMIZED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function imageUrlHint(input: string): string | null {
  const normalized = normalizeImageUrl(input);
  if (input.includes("drive.google.com/file/") && normalized !== input.trim()) {
    return "Google Drive link converted to a direct image URL.";
  }
  if (input.includes("google.com/url?")) {
    return "Google redirect links usually fail. Paste the original image URL directly.";
  }
  if (input.includes("drive.google.com") && !isOptimizableImageUrl(normalized)) {
    return "Make sure the Drive file is shared as “Anyone with the link”.";
  }
  if (input.includes("docs.google.com")) {
    return "Docs links work only when the image file itself is publicly accessible.";
  }
  return null;
}

export function hasRenderableImage(input: string | null | undefined): boolean {
  const normalized = normalizeImageUrl(input ?? "").trim();
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
