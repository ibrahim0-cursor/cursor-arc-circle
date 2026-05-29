// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @title Counter — Arc tutorial contract for MERIDIAN on-chain demo
contract Counter {
    uint256 public number;

    event NumberSet(uint256 newNumber);
    event Incremented(uint256 newNumber);

    function setNumber(uint256 newNumber) public {
        number = newNumber;
        emit NumberSet(newNumber);
    }

    function increment() public {
        number++;
        emit Incremented(number);
    }
}
