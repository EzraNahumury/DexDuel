// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Simple ERC20 token for development and testing on Base Sepolia.
 * Matches USDC decimals (6).
 */
contract MockUSDC is ERC20, Ownable {
    error ZeroAddress();

    constructor() ERC20("MockUSDC", "mUSDC") Ownable(msg.sender) {
        // Mint 1,000,000 tokens with 6 decimals to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @dev Overriding decimals to 6 to match USDC.
     */
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /**
     * @dev Function to mint tokens. Only callable by owner.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }
}
