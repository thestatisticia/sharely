export type DepositTier = {
  id: "low" | "medium" | "high";
  label: string;
  multiplier: number;
  hint: string;
};

export const DEPOSIT_TIERS: DepositTier[] = [
  {
    id: "high",
    label: "High value",
    multiplier: 10,
    hint: "Electronics, generators — max protection",
  },
  {
    id: "medium",
    label: "Standard",
    multiplier: 5,
    hint: "Tools, cameras — recommended for most items",
  },
  {
    id: "low",
    label: "Low risk",
    multiplier: 2,
    hint: "Small accessories — lighter collateral",
  },
];

export function recommendedDeposits(dailyRateG$: number) {
  if (!Number.isFinite(dailyRateG$) || dailyRateG$ <= 0) return [];
  return DEPOSIT_TIERS.map((tier) => ({
    ...tier,
    amount: Math.round(dailyRateG$ * tier.multiplier),
  }));
}
