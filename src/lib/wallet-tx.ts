import type { Abi, Address, Hash, PublicClient } from "viem";

import { ESCROW_ADDRESS, escrowAbi } from "@/lib/contracts";

// Wagmi's mutate type is strict; simulate `request` is compatible at runtime.
type WriteContractAsync = (request: any) => Promise<Hash>;

export type EscrowDeposit = {
  renter: Address;
  lister: Address;
  amount: bigint;
  lockedAt: bigint;
  claimableAfter: bigint;
  released: boolean;
};

export function isNonceTooLowError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("nonce too low") ||
    message.includes("NonceTooLow") ||
    message.includes("replacement transaction underpriced")
  );
}

export function isDepositExistsError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('"exists"') || message.includes("reason: exists");
}

/** Plain-language errors for wallet / RPC failures. */
export function formatWalletTxError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("User rejected") || message.includes("user rejected")) {
    return "Transaction cancelled in your wallet.";
  }

  if (isNonceTooLowError(message)) {
    return (
      "Your wallet sent a stale transaction (nonce mismatch). " +
      "Wait a few seconds and try again. If it keeps failing, open MetaMask → Settings → Advanced → " +
      "Clear activity tab data, then retry."
    );
  }

  if (isDepositExistsError(message)) {
    return "This deposit is already locked on-chain. Refresh the page — your booking may already be saved.";
  }

  if (message.includes("insufficient funds")) {
    return "Not enough CELO for gas. Keep a small amount of CELO (about 0.01+) in your wallet.";
  }

  if (message.length > 280) {
    const short = message.split("\n")[0];
    return short.length > 200 ? `${short.slice(0, 200)}…` : short;
  }

  return message;
}

export async function waitForSuccessfulTx(
  publicClient: PublicClient,
  hash: Hash,
): Promise<void> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("Transaction reverted on-chain.");
  }
}

/** Simulate + write with a fresh pending nonce; retry once on nonce drift. */
export async function writeContractFresh(
  publicClient: PublicClient,
  writeContractAsync: WriteContractAsync,
  account: Address,
  params: {
    address: Address;
    abi: Abi | readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  },
): Promise<Hash> {
  const send = async () => {
    const nonce = await publicClient.getTransactionCount({
      address: account,
      blockTag: "pending",
    });
    const { request } = await publicClient.simulateContract({
      address: params.address,
      abi: params.abi as Abi,
      functionName: params.functionName,
      args: params.args,
      account,
      nonce,
    });
    return writeContractAsync(request);
  };

  try {
    return await send();
  } catch (err) {
    if (isNonceTooLowError(err)) {
      return await send();
    }
    throw err;
  }
}

export async function readEscrowDeposit(
  publicClient: PublicClient,
  bookingId: `0x${string}`,
): Promise<EscrowDeposit | null> {
  if (!ESCROW_ADDRESS) return null;

  const [renter, lister, amount, lockedAt, claimableAfter, released] =
    await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: "deposits",
      args: [bookingId],
    });

  if (amount <= BigInt(0)) return null;

  return {
    renter,
    lister,
    amount,
    lockedAt,
    claimableAfter,
    released,
  };
}

export function isDepositLockedForRenter(
  deposit: EscrowDeposit | null,
  renter: Address,
): deposit is EscrowDeposit {
  return (
    deposit !== null &&
    !deposit.released &&
    deposit.amount > BigInt(0) &&
    deposit.renter.toLowerCase() === renter.toLowerCase()
  );
}
