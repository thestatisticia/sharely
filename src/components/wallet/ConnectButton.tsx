"use client";

import { Wallet } from "lucide-react";
import { useCallback } from "react";
import { useAccount, useConnect } from "wagmi";

import { Button } from "@/components/ui/Button";
import { useWalletModal } from "@/components/wallet/WalletModal";
import { CELO_CHAIN_ID } from "@/lib/contracts";
import { shortenAddress } from "@/lib/format";
import { getInjectedConnector, hasBrowserWallet } from "@/lib/wallet";

export function ConnectButton({
  compact = false,
  fullWidth = false,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { openModal } = useWalletModal();
  const injected = getInjectedConnector(connectors);

  const handleConnect = useCallback(() => {
    if (!hasBrowserWallet() || !injected) {
      openModal();
      return;
    }
    connect(
      { connector: injected, chainId: CELO_CHAIN_ID },
      {
        onError: () => openModal(),
      },
    );
  }, [connect, injected, openModal]);

  if (isConnected && address) {
    return (
      <Button
        variant="secondary"
        size={compact ? "sm" : "md"}
        onClick={openModal}
        aria-label="Wallet settings"
      >
        <Wallet className="h-4 w-4 text-primary" />
        {compact ? shortenAddress(address, 3) : shortenAddress(address)}
      </Button>
    );
  }

  return (
    <Button
      fullWidth={fullWidth}
      size={compact ? "sm" : "md"}
      variant={compact ? "gradient" : "primary"}
      onClick={handleConnect}
      disabled={isPending}
      aria-label="Connect wallet"
    >
      <Wallet className="h-4 w-4" />
      {isPending
        ? "Opening wallet..."
        : compact
          ? "Connect"
          : "Connect wallet"}
    </Button>
  );
}
