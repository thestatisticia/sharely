import { formatUnits, parseUnits } from "viem";

import { G_DOLLAR_DECIMALS } from "./contracts";

export function formatG$(amount: number | bigint, maxFractionDigits = 2): string {
  const value =
    typeof amount === "bigint"
      ? Number(formatUnits(amount, G_DOLLAR_DECIMALS))
      : amount;

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function parseG$(amount: string | number): bigint {
  return parseUnits(String(amount), G_DOLLAR_DECIMALS);
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
