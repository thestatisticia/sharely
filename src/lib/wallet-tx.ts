import type { Abi, Address, Hash, PublicClient } from "viem";
import { maxUint256 } from "viem";

import {
  ESCROW_ADDRESS,
  G_DOLLAR_TOKEN_ADDRESS,
  erc20Abi,
  escrowAbi,
} from "@/lib/contracts";
import { formatG$ } from "@/lib/format";

// Wagmi simulate `request` is passed through to writeContractAsync at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WriteContractAsync = (request: any) => Promise<Hash>;

export const MAX_GDOLLAR_APPROVAL = maxUint256;

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
  return (
    message.includes('"exists"') ||
    message.includes("reason: exists") ||
    message.includes(": exists")
  );
}

function extractRevertReason(message: string): string | null {
  const patterns = [
    /reason:\s*([^\n"}\]]+)/i,
    /reverted with the following reason:\s*([^\n]+)/i,
    /revert(?:ed)?(?: with reason(?: string)?)?:?\s*["']?(\w+)["']?/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    const reason = match?.[1]?.trim();
    if (reason && reason.length > 0 && reason !== "RPC") return reason;
  }
  return null;
}

export function formatEscrowLockError(
  err: unknown,
  depositWei: bigint,
): string {
  const message = err instanceof Error ? err.message : String(err);
  const reason = extractRevertReason(message);

  if (reason === "transfer" || message.includes('"transfer"')) {
    return (
      `Escrow could not pull ${formatG$(depositWei)} G$ from your wallet. ` +
      "Tap Request rental again — step 1 will re-approve G$ for escrow, then lock the deposit."
    );
  }
  if (reason === "exists" || isDepositExistsError(message)) {
    return "This deposit is already locked on-chain. Open My rentals — your booking may already be there.";
  }
  if (reason === "lister") {
    return "Invalid owner address for this listing. Ask the owner to re-list the item.";
  }
  if (reason === "amount") {
    return "Deposit amount is invalid. The listing may need to be updated.";
  }

  return formatWalletTxError(err);
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
    return "This deposit is already locked on-chain. Open My rentals — your booking may already be there.";
  }

  if (message.includes("insufficient funds")) {
    return "Not enough CELO for gas. Keep a small amount of CELO (about 0.01+) in your wallet.";
  }

  const reason = extractRevertReason(message);
  if (reason && reason !== "RPC") {
    return `Transaction failed: ${reason}`;
  }

  if (message.includes("reverted")) {
    return "Transaction would fail on-chain. Check your G$ balance and try again.";
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

export async function readGAllowance(
  publicClient: PublicClient,
  owner: Address,
): Promise<bigint> {
  if (!ESCROW_ADDRESS) return BigInt(0);
  return publicClient.readContract({
    address: G_DOLLAR_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, ESCROW_ADDRESS as Address],
  });
}

/** Simulate on current chain state, then send with a fresh pending nonce. */
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
    const { request } = await publicClient.simulateContract({
      address: params.address,
      abi: params.abi as Abi,
      functionName: params.functionName,
      args: params.args,
      account,
    });
    const nonce = await publicClient.getTransactionCount({
      address: account,
      blockTag: "pending",
    });
    return writeContractAsync({ ...request, nonce });
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

export async function preflightLockDeposit(
  publicClient: PublicClient,
  account: Address,
  bookingId: `0x${string}`,
  lister: Address,
  amount: bigint,
  rentalDays: number,
): Promise<void> {
  if (!ESCROW_ADDRESS) {
    throw new Error("Escrow contract not configured.");
  }

  try {
    await publicClient.simulateContract({
      address: ESCROW_ADDRESS as Address,
      abi: escrowAbi,
      functionName: "lockDeposit",
      args: [bookingId, lister, amount, BigInt(rentalDays)],
      account,
    });
  } catch (err) {
    throw new Error(formatEscrowLockError(err, amount));
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
