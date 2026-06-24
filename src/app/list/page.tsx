"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useSignMessage } from "wagmi";

import { ListingImage } from "@/components/items/ListingImage";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { VerificationBadge } from "@/components/wallet/VerificationBadge";
import { useWalletModal } from "@/components/wallet/WalletModal";
import { useVerificationState } from "@/hooks/useGoodDollar";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { imageUrlHint, normalizeImageUrl } from "@/lib/imageUrl";
import { KAMPALA_AREAS, formatKampalaLocation } from "@/lib/kampala";
import { buildListingSignMessage } from "@/lib/listing-sign";
import { createListing } from "@/lib/listings-api";
import { createId } from "@/lib/store";
import type { ItemCategory, Listing } from "@/lib/types";

import { Page, PageHero, Surface } from "@/components/layout/Page";

import { LISTING_PHOTOS, CATEGORY_IMAGES } from "@/lib/listing-images";

export default function ListPage() {
  const router = useRouter();
  const { openModal } = useWalletModal();
  const { signMessageAsync } = useSignMessage();
  const {
    address,
    isConnected,
    isOnCelo,
    canParticipate,
    isLoading,
    status,
  } = useVerificationState();
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<ItemCategory>("tools");
  const [preview, setPreview] = useState(LISTING_PHOTOS.drill);
  const [imageHint, setImageHint] = useState<string | null>(null);

  function handleImageUrlChange(raw: string) {
    const normalized = normalizeImageUrl(raw) || CATEGORY_IMAGES[previewCategory];
    setPreview(normalized);
    setImageHint(imageUrlHint(raw));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      openModal();
      setError("Connect your wallet in MetaMask to publish.");
      return;
    }

    if (!isOnCelo) {
      setError("Switch to Celo mainnet before listing.");
      return;
    }

    if (!canParticipate) {
      setError("Verify your GoodDollar identity on Profile before listing.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const area = String(form.get("area") || KAMPALA_AREAS[0]).trim();
    const category = String(form.get("category") || "other") as ItemCategory;
    const dailyRateG$ = Number(form.get("dailyRate"));
    const depositG$ = Number(form.get("deposit"));
    const imageUrl = normalizeImageUrl(
      String(form.get("imageUrl") || preview).trim(),
    );

    if (!title || !description || !area) {
      setError("Please fill in all required fields.");
      return;
    }

    const location = formatKampalaLocation(area);

    if (!Number.isFinite(dailyRateG$) || dailyRateG$ <= 0) {
      setError("Enter a valid daily rate greater than 0.");
      return;
    }

    if (!Number.isFinite(depositG$) || depositG$ < 0) {
      setError("Deposit must be 0 or more.");
      return;
    }

    const listing: Listing = {
      id: createId("listing"),
      title,
      description,
      category,
      imageUrl: imageUrl || CATEGORY_IMAGES[category],
      dailyRateG$,
      depositG$,
      location,
      area,
      distanceKm: 0.5,
      ownerAddress: address,
      ownerName: `You (${address.slice(0, 6)}…)`,
      createdAt: new Date().toISOString(),
      available: true,
    };

    try {
      setPublishing(true);
      await signMessageAsync({
        message: buildListingSignMessage(listing),
      });
      await createListing(listing);
      router.push(`/item/${listing.id}`);
    } catch (err) {
      setPublishing(false);
      const message =
        err instanceof Error ? err.message : "Could not save listing.";
      if (message.toLowerCase().includes("reject")) {
        setError("Signature cancelled. Approve in MetaMask to publish.");
      } else {
        setError(message);
      }
    }
  }

  const publishDisabled = publishing || isLoading;

  return (
    <Page className="gap-8">
      <PageHero
        title="List an item"
        description="Earn G$ renting tools and gear to verified neighbors in Kampala."
      >
        <VerificationBadge size="lg" />
      </PageHero>

      {!isConnected ? (
        <Surface className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold">Wallet required to publish</p>
            <p className="mt-1 text-sm text-muted">
              Fill in the form below, then sign with MetaMask when you publish.
            </p>
          </div>
          <ConnectButton />
        </Surface>
      ) : null}

      <form onSubmit={onSubmit} className="surface space-y-5 p-5 sm:p-6">
          <div className="relative">
            <ListingImage
              src={preview}
              alt="Listing preview"
              category={previewCategory}
              aspect="wide"
              rounded="2xl"
              sizes="400px"
            />
            <div className="absolute bottom-3 right-3 z-10 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold shadow">
              <ImagePlus className="mr-1 inline h-3.5 w-3.5" />
              Preview
            </div>
          </div>

          <div>
            <Label>Photo URL</Label>
            <Input
              name="imageUrl"
              placeholder="Paste image link or Google Drive share URL"
              onChange={(e) => handleImageUrlChange(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              Google Drive: paste the share link — we convert it automatically.
              File must be shared as &quot;Anyone with the link&quot;.
            </p>
            {imageHint ? (
              <p className="mt-1 text-xs font-medium text-primary">{imageHint}</p>
            ) : null}
          </div>

          <div>
            <Label>Title</Label>
            <Input name="title" placeholder="Cordless drill kit" required />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              name="description"
              placeholder="Condition, what's included, pickup notes…"
              required
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select
              name="category"
              defaultValue="tools"
              onChange={(e) => {
                const cat = e.target.value as ItemCategory;
                setPreviewCategory(cat);
                setPreview(CATEGORY_IMAGES[cat]);
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Neighborhood (Kampala)</Label>
            <Select name="area" defaultValue="Ntinda" required>
              {KAMPALA_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Daily rate (G$)</Label>
              <Input
                name="dailyRate"
                type="number"
                min={1}
                step={1}
                placeholder="120"
                required
              />
            </div>
            <div>
              <Label>Deposit (G$)</Label>
              <Input
                name="deposit"
                type="number"
                min={0}
                step={1}
                placeholder="800"
                required
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {!canParticipate && isConnected && !isLoading ? (
            <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {status === "wrong-chain"
                ? "Switch to Celo to publish."
                : "Complete GoodDollar verification on Profile to publish."}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={publishDisabled}
          >
            {publishing || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isLoading
              ? "Checking identity…"
              : publishing
                ? "Confirm in MetaMask…"
                : isConnected && canParticipate
                  ? "Sign & publish listing"
                  : "Publish listing"}
          </Button>
        </form>
    </Page>
  );
}
