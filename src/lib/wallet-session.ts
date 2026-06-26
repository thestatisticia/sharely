const SESSION_PREFIX = "sharely_wallet_session";

export type WalletSession = {
  signedAt: string;
};

export function buildWalletSessionMessage(
  address: string,
  timestamp: string,
): string {
  return [
    "SHARELY — Sign in with wallet",
    "",
    "One signature per browser session. No gas, no transaction.",
    "",
    `Wallet: ${address}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

export function getWalletSession(address: string): WalletSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(
      `${SESSION_PREFIX}_${address.toLowerCase()}`,
    );
    if (!raw) return null;
    return JSON.parse(raw) as WalletSession;
  } catch {
    return null;
  }
}

export function setWalletSession(address: string, signedAt: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${SESSION_PREFIX}_${address.toLowerCase()}`,
    JSON.stringify({ signedAt } satisfies WalletSession),
  );
}

export function clearWalletSession(address: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${SESSION_PREFIX}_${address.toLowerCase()}`);
}
