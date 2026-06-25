"use client";

import Link from "next/link";
import { Loader2, TrendingUp } from "lucide-react";

import { useClientRentals } from "@/hooks/useClientRentals";
import { useOwnerStats } from "@/hooks/useOwnerStats";
import { computeOwnerEarnings } from "@/lib/earnings";
import { formatG$ } from "@/lib/format";

export function EarningsCard({
  address,
}: {
  address: `0x${string}` | undefined;
}) {
  const { rentals, loading: rentalsLoading } = useClientRentals(address);
  const { stats, loading: statsLoading } = useOwnerStats(address);

  if (!address) return null;

  const statsEarnings = computeOwnerEarnings(rentals, address);
  const loading = rentalsLoading || statsLoading;

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Rental earnings</p>
            <p className="text-sm text-muted">From items you rent out</p>
          </div>
        </div>
        <Link
          href="/rentals"
          className="text-sm font-semibold text-primary hover:underline"
        >
          My rentals →
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-surface-hover p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Listed
            </p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {stats.listingsCount}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-hover p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Active
            </p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {statsEarnings.activeRentals}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-hover p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Completed
            </p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {stats.completedRentals}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-hover p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Earned
            </p>
            <p className="mt-1 text-xl font-extrabold text-emerald-700">
              {formatG$(statsEarnings.totalEarnedG$)}
              <span className="ml-0.5 text-xs font-semibold text-muted">G$</span>
            </p>
          </div>
        </div>
      )}

      {!loading && stats.listingsCount === 0 && stats.completedRentals === 0 ? (
        <p className="text-center text-sm text-muted">
          List items on{" "}
          <Link href="/list" className="font-semibold text-primary">
            Rent out
          </Link>{" "}
          to start earning G$ when renters book.
        </p>
      ) : null}
    </div>
  );
}
