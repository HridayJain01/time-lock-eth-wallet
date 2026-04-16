// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TimeLockWallet is ReentrancyGuard {
    address public immutable owner;
    uint256 public immutable unlockTime;

    event Deposited(address indexed from, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _unlockTime) payable {
        require(_unlockTime > block.timestamp, "Unlock time should be in future");

        owner = msg.sender;
        unlockTime = _unlockTime;

        if (msg.value > 0) {
            emit Deposited(msg.sender, msg.value, address(this).balance);
        }
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be greater than zero");
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    function withdraw() external onlyOwner nonReentrant {
        require(block.timestamp >= unlockTime, "Funds are locked");

        uint256 amount = address(this).balance;
        require(amount > 0, "No funds available");

        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit Withdrawn(owner, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
