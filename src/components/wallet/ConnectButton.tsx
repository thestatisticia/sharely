"use client";

import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/Button";
import { useWalletModal } from "@/components/wallet/WalletModal";
import { shortenAddress } from "@/lib/format";

export function ConnectButton({
  compact = false,
  fullWidth = false,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { openModal } = useWalletModal();

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
      onClick={openModal}
      aria-label="Connect wallet"
    >
      <Wallet className="h-4 w-4" />
      {compact ? "Connect" : "Connect wallet"}
    </Button>
  );
}
