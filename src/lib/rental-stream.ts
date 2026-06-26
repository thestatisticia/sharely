import type { PublicClient } from "viem";

import {
  CFA_FORWARDER_ADDRESS,
  CELO_CHAIN_ID,
  G_DOLLAR_TOKEN_ADDRESS,
  cfaForwarderAbi,
} from "@/lib/contracts";
import { formatG$ } from "@/lib/format";
import { dailyRateToFlowRate, streamedTotal } from "@/lib/superfluid";
import { formatWalletTxError } from "@/lib/wallet-tx";
import type { Rental } from "@/lib/types";

/** Minimum CELO (wei) we expect for a createFlow tx on Celo mainnet. */
export const MIN_CELO_FOR_STREAM_WEI = BigInt(5e15); // 0.005 CELO

export function rentalDailyRate(rental: Rental): number {
  return (
    rental.dailyRateG$ ??
    Math.round((rental.totalG$ - rental.depositG$) / Math.max(rental.days, 1))
  );
}

export async function getStreamBufferWei(
  publicClient: PublicClient,
  dailyRateG$: number,
): Promise<bigint> {
  const flowRate = dailyRateToFlowRate(dailyRateG$);
  if (flowRate <= BigInt(0)) {
    throw new Error("Daily rental rate is too low to start a payment stream.");
  }

  return publicClient.readContract({
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "getBufferAmountByFlowrate",
    args: [G_DOLLAR_TOKEN_ADDRESS, flowRate],
  });
}

export async function validateStreamStart({
  publicClient,
  rental,
  gBalanceWei,
  celoBalanceWei,
  chainId,
}: {
  publicClient: PublicClient;
  rental: Rental;
  gBalanceWei: bigint;
  celoBalanceWei: bigint | undefined;
  chainId: number | undefined;
}): Promise<{ flowRate: bigint; bufferWei: bigint; rentalCostWei: bigint }> {
  if (chainId !== CELO_CHAIN_ID) {
    throw new Error("Switch your wallet to Celo mainnet before starting the stream.");
  }

  const dailyRate = rentalDailyRate(rental);
  const flowRate = dailyRateToFlowRate(dailyRate);
  if (flowRate <= BigInt(0)) {
    throw new Error("Daily rental rate is too low to start a payment stream.");
  }

  const bufferWei = await getStreamBufferWei(publicClient, dailyRate);
  const rentalCostWei = streamedTotal(dailyRate, rental.days);
  const requiredG$ = rentalCostWei + bufferWei;

  if (gBalanceWei < requiredG$) {
    throw new Error(
      `Need ${formatG$(requiredG$)} G$ in your wallet for rental payments (including a small Superfluid buffer). ` +
        `Your balance: ${formatG$(gBalanceWei)} G$. ` +
        `The ${formatG$(rental.depositG$)} G$ deposit is locked separately in escrow.`,
    );
  }

  if (celoBalanceWei !== undefined && celoBalanceWei < MIN_CELO_FOR_STREAM_WEI) {
    throw new Error(
      "Low CELO balance for gas. Keep a small amount of CELO (about 0.01+) to confirm the stream transaction.",
    );
  }

  return { flowRate, bufferWei, rentalCostWei };
}

export function createFlowArgs(
  rental: Rental,
  renterAddress: `0x${string}`,
  flowRate: bigint,
) {
  return {
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "createFlow" as const,
    args: [
      G_DOLLAR_TOKEN_ADDRESS,
      renterAddress,
      rental.ownerAddress,
      flowRate,
      "0x",
    ] as const,
  };
}

export function deleteFlowArgs(rental: Rental) {
  return {
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "deleteFlow" as const,
    args: [
      G_DOLLAR_TOKEN_ADDRESS,
      rental.renterAddress,
      rental.ownerAddress,
      "0x",
    ] as const,
  };
}

export function updateFlowArgs(
  rental: Rental,
  renterAddress: `0x${string}`,
  flowRate: bigint,
) {
  return {
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "updateFlow" as const,
    args: [
      G_DOLLAR_TOKEN_ADDRESS,
      renterAddress,
      rental.ownerAddress,
      flowRate,
      "0x",
    ] as const,
  };
}

export type StreamStartPlan = "create" | "update" | "sync" | "replace";

export function planStreamStart(
  existingFlowRate: bigint,
  targetFlowRate: bigint,
): StreamStartPlan {
  if (existingFlowRate <= BigInt(0)) return "create";
  if (existingFlowRate === targetFlowRate) return "sync";
  return "update";
}

export async function getExistingFlowRate(
  publicClient: PublicClient,
  rental: Rental,
): Promise<bigint> {
  const result = await readFlowInfo(publicClient, rental);
  return result[1] as bigint;
}

export async function getFlowLastUpdated(
  publicClient: PublicClient,
  rental: Rental,
): Promise<bigint> {
  const result = await readFlowInfo(publicClient, rental);
  return result[0] as bigint;
}

async function readFlowInfo(publicClient: PublicClient, rental: Rental) {
  return publicClient.readContract({
    address: CFA_FORWARDER_ADDRESS,
    abi: cfaForwarderAbi,
    functionName: "getFlowInfo",
    args: [
      G_DOLLAR_TOKEN_ADDRESS,
      rental.renterAddress,
      rental.ownerAddress,
    ],
  });
}

export function formatStreamStartError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("0x801b6863") || message.includes("FLOW_ALREADY_EXISTS")) {
    return "Could not start stream. Try again — an existing stream will be updated automatically.";
  }
  if (message.toLowerCase().includes("reject")) {
    return "Cancelled in MetaMask.";
  }
  if (message.includes("insufficient") || message.includes("balance")) {
    return "Not enough G$ for rental payments (separate from your escrow deposit).";
  }
  if (message.includes("nonce too low")) {
    return formatWalletTxError(err);
  }
  return message.length > 200 ? "Could not start payment stream. Try again." : message;
}
