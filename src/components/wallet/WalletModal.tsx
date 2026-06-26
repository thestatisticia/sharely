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
import { useWalletSession } from "@/hooks/useWalletSession";
import { CELO_CHAIN_ID } from "@/lib/contracts";
import { shortenAddress } from "@/lib/format";
import { connectInjectedWallet } from "@/lib/wallet-connect";
import { clearWalletSession } from "@/lib/wallet-session";
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
  const { connectors, connectAsync, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { isSessionSigned, ensureSession } = useWalletSession();
  const [signingIn, setSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const wrongChain = isConnected && chainId !== CELO_CHAIN_ID;
  const injected = getInjectedConnector(connectors);
  const walletAvailable = hasBrowserWallet();

  const handleConnect = useCallback(async () => {
    if (!injected) return;
    setLocalError(null);
    setSigningIn(true);
    try {
      await connectInjectedWallet({
        connectAsync,
        connector: injected,
        isConnected,
      });
      await ensureSession();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("reject")) {
        setLocalError("Signature cancelled. Approve in your wallet to sign in.");
      } else {
        setLocalError(message);
      }
    } finally {
      setSigningIn(false);
    }
  }, [connectAsync, ensureSession, injected, isConnected, onClose]);

  const handleCompleteSignIn = useCallback(async () => {
    setLocalError(null);
    setSigningIn(true);
    try {
      await ensureSession();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("reject")) {
        setLocalError("Signature cancelled. Approve in your wallet to sign in.");
      } else {
        setLocalError(message);
      }
    } finally {
      setSigningIn(false);
    }
  }, [ensureSession, onClose]);

  const displayError = localError ?? error?.message;
  const busy = isPending || signingIn;

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
            <p className="text-sm text-muted">Celo mainnet · one sign-in per session</p>
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
              <p className="mt-1 text-sm text-muted">
                Sign-in: {isSessionSigned ? "Complete" : "Required"}
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

            {!isSessionSigned ? (
              <Button
                fullWidth
                onClick={() => void handleCompleteSignIn()}
                disabled={busy}
              >
                {busy ? "Waiting for signature…" : "Complete sign-in (one time)"}
              </Button>
            ) : null}

            <Button
              fullWidth
              variant="secondary"
              onClick={() => {
                clearWalletSession(address);
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
                  onClick={() => void handleConnect()}
                  disabled={busy || !injected}
                >
                  <Smartphone className="h-4 w-4" />
                  {busy ? "Waiting for wallet…" : "Connect & sign in"}
                </Button>
                <p className="text-sm leading-relaxed text-muted">
                  Approve connection in MetaMask, then sign once to use SHARELY.
                  No gas for sign-in.
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

            {displayError ? (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {displayError.includes("extension not found")
                  ? "Wallet extension not detected. Install MetaMask and refresh, or open this site inside MiniPay."
                  : displayError.includes("Connector already connected")
                    ? "Wallet is already linked. Refresh the page, or tap Complete sign-in if shown."
                    : displayError}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
