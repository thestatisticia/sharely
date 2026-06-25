/** Deterministic owner stats for marketplace trust UI (demo + live wallets). */
export type OwnerProfile = {
  displayName: string;
  rating: number;
  rentalCount: number;
  verified: boolean;
};

function hashAddress(address: string): number {
  return parseInt(address.slice(-8), 16) || 1;
}

export function getOwnerProfile(
  ownerAddress: string,
  ownerName: string,
): OwnerProfile {
  const hash = hashAddress(ownerAddress);
  const rating = Math.round((4.5 + (hash % 5) / 10) * 10) / 10;
  const rentalCount = 8 + (hash % 17);

  const displayName = ownerName.includes("You (")
    ? "You"
    : ownerName.replace(/\.$/, "");

  return {
    displayName,
    rating,
    rentalCount,
    verified: true,
  };
}
