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
import {
  hasRenderableImage,
  imageUrlHint,
  normalizeImageUrl,
} from "@/lib/imageUrl";
import { KAMPALA_AREAS, formatKampalaLocation } from "@/lib/kampala";
import { buildListingSignMessage } from "@/lib/listing-sign";
import { createListing } from "@/lib/listings-api";
import { recommendedDeposits } from "@/lib/deposit-recommendations";
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
  const [dailyRate, setDailyRate] = useState("");
  const [deposit, setDeposit] = useState("");

  const depositTiers = recommendedDeposits(Number(dailyRate) || 0);

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
      setError("Connect your wallet to publish in seconds.");
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

    if (!hasRenderableImage(imageUrl)) {
      setError("Add a valid image URL. Listings without images are not published.");
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
        title="Rent out your gear"
        description="Turn unused items into income. Set your daily rate and security deposit — renters pay in G$ with escrow protection."
      >
        <VerificationBadge size="lg" />
      </PageHero>

      {!isConnected ? (
        <Surface className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold">Connect wallet to publish</p>
            <p className="mt-1 text-sm text-muted">
              Owners earn G$ when verified renters book their gear.
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
            <Label>Upload photos</Label>
            <Input
              name="imageUrl"
              placeholder="Paste image link or Google Drive share URL"
              onChange={(e) => handleImageUrlChange(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              Google Drive: paste the share link — we convert it automatically.
              File must be shared as &quot;Anyone with the link&quot; and not restricted.
            </p>
            {imageHint ? (
              <p className="mt-1 text-xs font-medium text-primary">{imageHint}</p>
            ) : null}
          </div>

          <div>
            <Label>What are you renting?</Label>
            <Input name="title" placeholder="Sony woofer speaker" required />
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
              <Label>Daily rate (G$/day)</Label>
              <Input
                name="dailyRate"
                type="number"
                min={1}
                step={1}
                placeholder="120"
                required
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
            <div>
              <Label>Security deposit (G$)</Label>
              <Input
                name="deposit"
                type="number"
                min={0}
                step={1}
                placeholder="800"
                required
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </div>
          </div>

          {depositTiers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">
                Recommended deposit (based on daily rate)
              </p>
              <div className="flex flex-wrap gap-2">
                {depositTiers.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setDeposit(String(tier.amount))}
                    className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
                      deposit === String(tier.amount)
                        ? "border-primary bg-accent font-semibold text-primary"
                        : "border-border bg-surface-hover hover:border-primary/40"
                    }`}
                  >
                    <span className="font-bold">{tier.label}</span>
                    <span className="mx-1 text-muted">·</span>
                    <span>{tier.amount} G$</span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {tier.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
                  ? "Publish listing"
                  : "Publish listing"}
          </Button>
        </form>
    </Page>
  );
}
