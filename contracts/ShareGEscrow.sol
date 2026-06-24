// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title ShareGEscrow — holds refundable G$ deposits for neighbor rentals
contract ShareGEscrow {
    IERC20 public immutable gDollar;

    struct DepositLock {
        address renter;
        address lister;
        uint256 amount;
        uint64 lockedAt;
        uint64 claimableAfter;
        bool released;
    }

    mapping(bytes32 => DepositLock) public deposits;

    event DepositLocked(
        bytes32 indexed bookingId,
        address indexed renter,
        address indexed lister,
        uint256 amount,
        uint64 claimableAfter
    );
    event DepositReleased(bytes32 indexed bookingId, address indexed to, uint256 amount);

    constructor(address gDollarToken) {
        require(gDollarToken != address(0), "token");
        gDollar = IERC20(gDollarToken);
    }

    /// @notice Renter locks a refundable deposit for a booking
    function lockDeposit(
        bytes32 bookingId,
        address lister,
        uint256 amount,
        uint64 rentalDays
    ) external {
        require(lister != address(0), "lister");
        require(amount > 0, "amount");
        DepositLock storage lock = deposits[bookingId];
        require(lock.amount == 0, "exists");

        require(gDollar.transferFrom(msg.sender, address(this), amount), "transfer");

        uint64 claimableAfter = uint64(block.timestamp + uint256(rentalDays) * 1 days + 2 days);
        deposits[bookingId] = DepositLock({
            renter: msg.sender,
            lister: lister,
            amount: amount,
            lockedAt: uint64(block.timestamp),
            claimableAfter: claimableAfter,
            released: false
        });

        emit DepositLocked(bookingId, msg.sender, lister, amount, claimableAfter);
    }

    /// @notice Lister confirms item return — deposit goes back to renter
    function confirmReturn(bytes32 bookingId) external {
        DepositLock storage lock = deposits[bookingId];
        require(msg.sender == lock.lister, "not lister");
        require(!lock.released, "released");
        _release(bookingId, lock.renter);
    }

    /// @notice Renter claims deposit after grace period if lister never confirms
    function claimDeposit(bytes32 bookingId) external {
        DepositLock storage lock = deposits[bookingId];
        require(msg.sender == lock.renter, "not renter");
        require(!lock.released, "released");
        require(block.timestamp >= lock.claimableAfter, "grace");
        _release(bookingId, lock.renter);
    }

    function _release(bytes32 bookingId, address to) internal {
        DepositLock storage lock = deposits[bookingId];
        lock.released = true;
        require(gDollar.transfer(to, lock.amount), "transfer");
        emit DepositReleased(bookingId, to, lock.amount);
    }
}
