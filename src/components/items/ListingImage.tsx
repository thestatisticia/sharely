"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { fallbackImageForCategory } from "@/lib/listing-images";
import {
  isOptimizableImageUrl,
  normalizeImageUrl,
} from "@/lib/imageUrl";
import type { ItemCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export const LISTING_IMAGE_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwA/8AAI/9k=";

type Aspect = "square" | "landscape" | "wide" | "card";

const aspectClass: Record<Aspect, string> = {
  square: "aspect-square",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/10]",
  card: "aspect-[4/3]",
};

export function ListingImage({
  src,
  alt,
  category,
  aspect = "card",
  priority = false,
  sizes = "(max-width: 512px) 100vw, 384px",
  className,
  imageClassName,
  rounded = "2xl",
  showGradient = false,
  fillContainer = false,
  fallbackToCategory = true,
}: {
  src: string;
  alt: string;
  category?: ItemCategory;
  aspect?: Aspect;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  rounded?: "2xl" | "3xl" | "none";
  showGradient?: boolean;
  fillContainer?: boolean;
  /** When false, show empty shell instead of category stock photo (e.g. list preview). */
  fallbackToCategory?: boolean;
}) {
  const primary = normalizeImageUrl(src.trim());
  const resolved =
    primary || (fallbackToCategory ? fallbackImageForCategory(category) : "");
  const [activeSrc, setActiveSrc] = useState(resolved);

  useEffect(() => {
    const next =
      normalizeImageUrl(src.trim()) ||
      (fallbackToCategory ? fallbackImageForCategory(category) : "");
    setActiveSrc(next);
  }, [src, category, fallbackToCategory]);

  const onError = useCallback(() => {
    if (!fallbackToCategory) return;
    setActiveSrc((current) => {
      const fallback = fallbackImageForCategory(category);
      return current === fallback ? current : fallback;
    });
  }, [category, fallbackToCategory]);

  const useNextImage = Boolean(activeSrc) && isOptimizableImageUrl(activeSrc);

  const roundedClass =
    rounded === "none"
      ? ""
      : rounded === "3xl"
        ? "rounded-3xl"
        : "rounded-2xl";

  const shellClass = cn(
    "relative overflow-hidden bg-surface-hover",
    !fillContainer && aspectClass[aspect],
    roundedClass,
    className,
  );

  const imgClass = cn(
    "object-cover object-center",
    useNextImage ? "" : "absolute inset-0 h-full w-full",
    imageClassName,
  );

  return (
    <div className={shellClass}>
      {!activeSrc ? (
        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 p-6 text-center text-muted">
          <ImagePlus className="h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">No photo yet</p>
          <p className="text-xs">Choose or take a photo below</p>
        </div>
      ) : useNextImage ? (
        <Image
          src={activeSrc}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          quality={85}
          placeholder="blur"
          blurDataURL={LISTING_IMAGE_BLUR}
          className={imgClass}
          onError={onError}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeSrc}
          alt={alt}
          className={imgClass}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={onError}
        />
      )}
      {showGradient ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
