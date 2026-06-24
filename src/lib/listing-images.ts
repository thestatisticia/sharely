import type { ItemCategory } from "@/lib/types";

/** Stable Unsplash URLs — real photos per category */
export function unsplashPhoto(
  id: string,
  width = 800,
  height = 600,
): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=85`;
}

export const LISTING_PHOTOS = {
  drill: unsplashPhoto("1504148455328-c376907d081c"),
  tent: unsplashPhoto("1478131143081-80f7f84ca84e"),
  ringLight: unsplashPhoto("1598488035139-bcb689d5eccf"),
  pressureWasher: unsplashPhoto("1581578731548-c64695cc6952"),
  generator: unsplashPhoto("1621905251189-08b45d6a269e"),
  ladder: unsplashPhoto("1607408497555-43165c0a1c66"),
} as const;

export const CATEGORY_IMAGES: Record<ItemCategory, string> = {
  tools: LISTING_PHOTOS.drill,
  sports: LISTING_PHOTOS.tent,
  electronics: LISTING_PHOTOS.ringLight,
  home: LISTING_PHOTOS.ladder,
  other: LISTING_PHOTOS.drill,
};

export function fallbackImageForCategory(
  category?: ItemCategory,
): string {
  return category ? CATEGORY_IMAGES[category] : LISTING_PHOTOS.drill;
}
