import type { Connector } from "wagmi";

import { CELO_CHAIN_ID } from "@/lib/contracts";

export function isConnectorAlreadyConnectedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Connector already connected") ||
    message.includes("AlreadyConnected")
  );
}

type ConnectAsync = (variables: {
  connector: Connector;
  chainId?: number;
}) => Promise<unknown>;

/** Connect injected wallet without throwing when MetaMask is already linked. */
export async function connectInjectedWallet({
  connectAsync,
  connector,
  chainId = CELO_CHAIN_ID,
  isConnected,
}: {
  connectAsync: ConnectAsync;
  connector: Connector;
  chainId?: number;
  isConnected: boolean;
}): Promise<void> {
  if (isConnected) return;

  try {
    await connectAsync({ connector, chainId });
  } catch (err) {
    if (!isConnectorAlreadyConnectedError(err)) throw err;
    // MetaMask already authorized this site — wagmi will sync account state.
  }
}
