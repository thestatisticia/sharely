import { parseAbi } from "viem";

export const CELO_CHAIN_ID = 42_220 as const;

export const G_DOLLAR_TOKEN_ADDRESS =
  "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as const;

export const IDENTITY_ADDRESS =
  "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" as const;

export const CFA_FORWARDER_ADDRESS =
  "0xcfA132E353cB4E398080B9700609bb008eceB125" as const;

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "") as `0x${string}` | "";

export const G_DOLLAR_DECIMALS = 18;

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
]);

export const identityAbi = parseAbi([
  "function isWhitelisted(address account) view returns (bool)",
  "function getWhitelistedRoot(address account) view returns (address)",
  "function lastAuthenticated(address account) view returns (uint256)",
  "function authenticationPeriod() view returns (uint256)",
]);

export const escrowAbi = parseAbi([
  "function lockDeposit(bytes32 bookingId, address lister, uint256 amount, uint64 rentalDays)",
  "function confirmReturn(bytes32 bookingId)",
  "function claimDeposit(bytes32 bookingId)",
  "function deposits(bytes32 bookingId) view returns (address renter, address lister, uint256 amount, uint64 lockedAt, uint64 claimableAfter, bool released)",
]);

export const cfaForwarderAbi = parseAbi([
  "function createFlow(address token, address sender, address receiver, int96 flowRate, bytes userData) returns (bool)",
  "function deleteFlow(address token, address sender, address receiver, bytes userData) returns (bool)",
  "function getFlowInfo(address token, address sender, address receiver) view returns (uint256 timestamp, int96 flowRate, uint256 deposit, uint256 owedDeposit)",
  "function getBufferAmountByFlowrate(address token, int96 flowRate) view returns (uint256 deposit, uint256 owedDeposit)",
]);
