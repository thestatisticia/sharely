"use client";

import { Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { useAccount, useConnect } from "wagmi";

import { Button } from "@/components/ui/Button";
import { useWalletModal } from "@/components/wallet/WalletModal";
import { shortenAddress } from "@/lib/format";
import { connectInjectedWallet } from "@/lib/wallet-connect";
import { getInjectedConnector, hasBrowserWallet } from "@/lib/wallet";
import { useWalletSession } from "@/hooks/useWalletSession";

export function ConnectButton({
  compact = false,
  fullWidth = false,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { openModal } = useWalletModal();
  const { ensureSession } = useWalletSession();
  const [busy, setBusy] = useState(false);
  const injected = getInjectedConnector(connectors);

  const handleConnect = useCallback(async () => {
    if (!hasBrowserWallet() || !injected) {
      openModal();
      return;
    }

    setBusy(true);
    try {
      await connectInjectedWallet({
        connectAsync,
        connector: injected,
        isConnected,
      });
      await ensureSession();
    } catch {
      openModal();
    } finally {
      setBusy(false);
    }
  }, [connectAsync, ensureSession, injected, isConnected, openModal]);

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

  const pending = isPending || busy;

  return (
    <Button
      fullWidth={fullWidth}
      size={compact ? "sm" : "md"}
      variant={compact ? "gradient" : "primary"}
      onClick={() => void handleConnect()}
      disabled={pending}
      aria-label="Connect wallet"
    >
      <Wallet className="h-4 w-4" />
      {pending
        ? "Opening wallet..."
        : compact
          ? "Connect"
          : "Connect wallet"}
    </Button>
  );
}
