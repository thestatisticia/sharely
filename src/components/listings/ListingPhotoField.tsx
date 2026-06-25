"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Link2, Loader2 } from "lucide-react";

import { ListingImage } from "@/components/items/ListingImage";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import {
  hasRenderableImage,
  imageUrlHint,
  normalizeImageUrl,
} from "@/lib/imageUrl";
import {
  LISTING_IMAGE_ACCEPT,
  uploadListingImage,
  validateListingImageFile,
} from "@/lib/listing-upload";
import { useRemoteListings } from "@/lib/listings-api";
import type { ItemCategory } from "@/lib/types";

type ListingPhotoFieldProps = {
  preview: string;
  category: ItemCategory;
  uploadedUrl: string | null;
  onPreviewChange: (url: string) => void;
  onUploadedUrlChange: (url: string | null) => void;
  onError: (message: string | null) => void;
  ownerAddress: `0x${string}` | undefined;
  onConnectWallet: () => void;
};

export function ListingPhotoField({
  preview,
  category,
  uploadedUrl,
  onPreviewChange,
  onUploadedUrlChange,
  onError,
  ownerAddress,
  onConnectWallet,
}: ListingPhotoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [imageHint, setImageHint] = useState<string | null>(null);

  const remoteEnabled = useRemoteListings();

  async function handleFile(file: File) {
    onError(null);

    if (!ownerAddress) {
      onConnectWallet();
      onError("Connect your wallet to upload a photo.");
      return;
    }

    if (!remoteEnabled) {
      onError("Photo upload needs Supabase. Paste an image link below instead.");
      setShowLinkInput(true);
      return;
    }

    const validation = validateListingImageFile(file);
    if (validation) {
      onError(validation);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    onPreviewChange(localPreview);
    setUploading(true);

    try {
      const url = await uploadListingImage(file, ownerAddress);
      URL.revokeObjectURL(localPreview);
      onUploadedUrlChange(url);
      onPreviewChange(url);
      setShowLinkInput(false);
      setLinkValue("");
      setImageHint(null);
    } catch (err) {
      URL.revokeObjectURL(localPreview);
      onPreviewChange(uploadedUrl ?? preview);
      onError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  function handleLinkChange(raw: string) {
    setLinkValue(raw);
    onUploadedUrlChange(null);
    const normalized = normalizeImageUrl(raw);
    if (normalized) onPreviewChange(normalized);
    setImageHint(imageUrlHint(raw));
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <ListingImage
          src={preview}
          alt="Listing preview"
          category={category}
          aspect="wide"
          rounded="2xl"
          sizes="400px"
          fallbackToCategory={false}
        />
        <div className="absolute bottom-3 right-3 z-10 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold shadow">
          {uploading ? (
            <>
              <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
              Uploading…
            </>
          ) : uploadedUrl ? (
            "Uploaded"
          ) : (
            <>
              <ImagePlus className="mr-1 inline h-3.5 w-3.5" />
              Preview
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Listing photo</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Choose photo
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Take photo
          </Button>
        </div>
        <p className="text-xs text-muted">
          JPG, PNG, or WebP · max 5 MB. Photos are stored securely and load
          reliably for all renters.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={LISTING_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept={LISTING_IMAGE_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => setShowLinkInput((open) => !open)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <Link2 className="h-4 w-4" />
          {showLinkInput ? "Hide link option" : "Or paste an image link"}
        </button>

        {showLinkInput ? (
          <div>
            <Input
              name="imageUrl"
              placeholder="https://… or Google Drive share URL"
              value={linkValue}
              onChange={(e) => handleLinkChange(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              Links can break if permissions change. Uploading a photo is more
              reliable.
            </p>
            {imageHint ? (
              <p className="mt-1 text-xs font-medium text-primary">{imageHint}</p>
            ) : null}
            {linkValue && !hasRenderableImage(normalizeImageUrl(linkValue)) ? (
              <p className="mt-1 text-xs text-amber-800">
                Enter a valid http(s) image URL.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
