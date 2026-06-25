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
import { ExternalLink, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CELO_CHAIN_ID } from "@/lib/contracts";
import { shortenAddress } from "@/lib/format";
import { getInjectedConnector, hasBrowserWallet } from "@/lib/wallet";

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
  const injected = getInjectedConnector(connectors);
  const walletAvailable = hasBrowserWallet();

  const handleConnect = useCallback(() => {
    if (!injected) return;
    connect(
      { connector: injected, chainId: CELO_CHAIN_ID },
      { onSuccess: onClose },
    );
  }, [connect, injected, onClose]);

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
            {walletAvailable ? (
              <>
                <Button
                  fullWidth
                  size="lg"
                  onClick={handleConnect}
                  disabled={isPending || !injected}
                >
                  <Smartphone className="h-4 w-4" />
                  {isPending ? "Opening wallet..." : "Connect MetaMask"}
                </Button>
                <p className="text-sm leading-relaxed text-muted">
                  Approve the connection in your wallet popup, then switch to
                  Celo mainnet if prompted.
                </p>
              </>
            ) : (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">No wallet detected</p>
                <p className="mt-1">
                  Install MetaMask for Chrome, then refresh this page.
                </p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-950 underline"
                >
                  Get MetaMask
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {error ? (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error.message.includes("extension not found")
                  ? "Wallet extension not detected. Install MetaMask and refresh, or open this site inside MiniPay."
                  : error.message}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
