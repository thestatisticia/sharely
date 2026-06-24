"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { celo } from "viem/chains";
import { Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CELO_CHAIN_ID } from "@/lib/contracts";
import { shortenAddress } from "@/lib/format";

type WalletModalContextValue = {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const WalletModalContext = createContext<WalletModalContextValue | null>(null);

export function useWalletModal() {
  const ctx = useContext(WalletModalContext);
  if (!ctx) {
    throw new Error("useWalletModal must be used within WalletModalProvider");
  }
  return ctx;
}

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
    }),
    [open],
  );

  return (
    <WalletModalContext.Provider value={value}>
      {children}
      {open ? <WalletModal onClose={() => setOpen(false)} /> : null}
    </WalletModalContext.Provider>
  );
}

function WalletModal({ onClose }: { onClose: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const wrongChain = isConnected && chainId !== CELO_CHAIN_ID;
  const metaMaskConnector = connectors.find(
    (c) => c.id === "metaMaskSDK" || c.type === "metaMask",
  );
  const injected = connectors.find((c) => c.id === "injected");
  const browserConnector = metaMaskConnector ?? injected;

  const handleConnect = useCallback(() => {
    if (!browserConnector) return;
    connect(
      { connector: browserConnector, chainId: CELO_CHAIN_ID },
      { onSuccess: onClose },
    );
  }, [connect, browserConnector, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-overlay p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close wallet modal"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Connect wallet
            </h2>
            <p className="text-sm text-muted">Celo mainnet · G$ payments</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-surface-hover"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isConnected && address ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-hover p-4">
              <p className="eyebrow">Connected</p>
              <p className="mt-1 font-semibold text-foreground">
                {shortenAddress(address, 6)}
              </p>
              <p className="mt-1 text-sm text-muted">
                Network: {wrongChain ? "Wrong network" : "Celo"}
              </p>
            </div>

            {wrongChain ? (
              <Button
                fullWidth
                onClick={() => switchChain({ chainId: celo.id })}
                disabled={isSwitching}
              >
                Switch to Celo
              </Button>
            ) : null}

            <Button
              fullWidth
              variant="secondary"
              onClick={() => {
                disconnect();
                onClose();
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              fullWidth
              size="lg"
              onClick={handleConnect}
              disabled={isPending || !browserConnector}
            >
              <Smartphone className="h-4 w-4" />
              {metaMaskConnector ? "Connect MetaMask" : "Connect browser wallet"}
            </Button>

            <p className="text-sm leading-relaxed text-muted">
              {metaMaskConnector
                ? "Approve the connection in MetaMask, then switch to Celo mainnet if prompted."
                : "Use a Celo wallet in your browser — e.g. MiniPay or MetaMask."}
            </p>

            {error ? (
              <p className="text-sm text-danger">{error.message}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
