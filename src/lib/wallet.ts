import type { Connector } from "wagmi";

/** Browser extension wallet (MetaMask, MiniPay in-app browser, etc.) */
export function getInjectedConnector(connectors: readonly Connector[]) {
  return connectors.find((c) => c.id === "injected" || c.type === "injected");
}

export function hasBrowserWallet(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as Window & { ethereum?: unknown }).ethereum;
  return Boolean(eth);
}
