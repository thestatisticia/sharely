"use client";

import { useAccount, useReadContracts } from "wagmi";
import { zeroAddress } from "viem";

import {
  CELO_CHAIN_ID,
  G_DOLLAR_TOKEN_ADDRESS,
  IDENTITY_ADDRESS,
  erc20Abi,
  identityAbi,
} from "@/lib/contracts";
import { formatG$ } from "@/lib/format";

export type VerificationStatus =
  | "disconnected"
  | "wrong-chain"
  | "loading"
  | "unverified"
  | "expired"
  | "verified";

const ZERO = zeroAddress.toLowerCase();

export function useVerificationState() {
  const { address, isConnected, chainId } = useAccount();

  const { data, isLoading, refetch, isFetching } = useReadContracts({
    contracts: address
      ? [
          {
            address: IDENTITY_ADDRESS,
            abi: identityAbi,
            functionName: "getWhitelistedRoot",
            args: [address],
            chainId: CELO_CHAIN_ID,
          },
          {
            address: IDENTITY_ADDRESS,
            abi: identityAbi,
            functionName: "authenticationPeriod",
            chainId: CELO_CHAIN_ID,
          },
        ]
      : [],
    query: {
      enabled: Boolean(address && chainId === CELO_CHAIN_ID),
      staleTime: 15_000,
    },
  });

  const root = data?.[0]?.result as `0x${string}` | undefined;
  const authPeriod = data?.[1]?.result as bigint | undefined;
  const isWhitelisted = Boolean(
    root && root.toLowerCase() !== ZERO,
  );

  const { data: rootAuthData, isLoading: rootAuthLoading } = useReadContracts({
    contracts:
      root && isWhitelisted
        ? [
            {
              address: IDENTITY_ADDRESS,
              abi: identityAbi,
              functionName: "lastAuthenticated",
              args: [root],
              chainId: CELO_CHAIN_ID,
            },
          ]
        : [],
    query: { enabled: Boolean(root && isWhitelisted), staleTime: 15_000 },
  });

  const lastAuth = rootAuthData?.[0]?.result as bigint | undefined;

  const authExpiry =
    lastAuth !== undefined && authPeriod !== undefined
      ? Number(lastAuth) + Number(authPeriod) * 86_400
      : undefined;

  const daysUntilExpiry =
    authExpiry !== undefined
      ? Math.max(0, Math.ceil((authExpiry * 1000 - Date.now()) / 86_400_000))
      : undefined;

  const isAuthExpired =
    isWhitelisted &&
    authExpiry !== undefined &&
    authExpiry * 1000 < Date.now();

  let status: VerificationStatus = "disconnected";
  if (!isConnected) status = "disconnected";
  else if (chainId !== CELO_CHAIN_ID) status = "wrong-chain";
  else if (isLoading || rootAuthLoading || isFetching) status = "loading";
  else if (!isWhitelisted) status = "unverified";
  else if (isAuthExpired) status = "expired";
  else status = "verified";

  return {
    address,
    root,
    isConnected,
    chainId,
    isOnCelo: chainId === CELO_CHAIN_ID,
    isWhitelisted,
    isVerified: status === "verified",
    /** GoodDollar whitelisted on Celo — same gate the claim SDK uses */
    canParticipate: status === "verified",
    status,
    isLoading: status === "loading",
    daysUntilExpiry,
    refetch,
  };
}

export function useGBalance() {
  const { address, chainId } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: address
      ? [
          {
            address: G_DOLLAR_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
            chainId: CELO_CHAIN_ID,
          },
        ]
      : [],
    query: { enabled: Boolean(address && chainId === CELO_CHAIN_ID), staleTime: 30_000 },
  });

  const balance = data?.[0]?.result as bigint | undefined;

  return {
    balance,
    balanceLabel: balance !== undefined ? formatG$(balance) : "—",
    isLoading,
    refetch,
  };
}

export function useVerification() {
  const state = useVerificationState();
  return {
    address: state.address,
    isConnected: state.isConnected,
    isVerified: state.isVerified,
    isLoading: state.isLoading,
    refetch: state.refetch,
  };
}
