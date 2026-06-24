import { keccak256, encodePacked, type Address } from "viem";

export function createBookingId(
  listingId: string,
  renter: Address,
  owner: Address,
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["string", "address", "address", "uint256"],
      [listingId, renter, owner, BigInt(Date.now())],
    ),
  );
}
