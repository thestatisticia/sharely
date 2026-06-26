"use client";

import { useCallback, useMemo } from "react";
import { useAccount, useSignMessage } from "wagmi";

import {
  buildWalletSessionMessage,
  getWalletSession,
  setWalletSession,
} from "@/lib/wallet-session";

export function useWalletSession() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const isSessionSigned = useMemo(
    () => Boolean(address && getWalletSession(address)),
    [address],
  );

  const ensureSession = useCallback(async () => {
    if (!address) {
      throw new Error("Connect your wallet first.");
    }
    if (getWalletSession(address)) return;

    const signedAt = new Date().toISOString();
    await signMessageAsync({
      message: buildWalletSessionMessage(address, signedAt),
    });
    setWalletSession(address, signedAt);
  }, [address, signMessageAsync]);

  return { isSessionSigned, ensureSession };
}
