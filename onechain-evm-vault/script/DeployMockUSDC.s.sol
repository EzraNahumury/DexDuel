// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract DeployMockUSDC is Script {
    function run() external {
        // Read PRIVATE_KEY from environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions to the network
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC
        MockUSDC mockUsdc = new MockUSDC();

        // Stop broadcasting
        vm.stopBroadcast();

        // Print deployed address using console2
        console2.log("MockUSDC deployed at:", address(mockUsdc));
        console2.log("Token Name:", mockUsdc.name());
        console2.log("Token Symbol:", mockUsdc.symbol());
    }
}
