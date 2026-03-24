// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Vault.sol";

contract DeployVault is Script {
    function run() external {
        // Retrieve deployment parameters from environment variables
        // Default to Base Sepolia testnet token (e.g. USDC or a test token)
        address token = vm.envOr("TOKEN_ADDRESS", address(0));
        address operator = vm.envOr("OPERATOR_ADDRESS", msg.sender);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        Vault vault = new Vault(token, operator);

        vm.stopBroadcast();

        console.log("Vault deployed at:", address(vault));
        console.log("Token:", token);
        console.log("Operator:", operator);
    }
}
