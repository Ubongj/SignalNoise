// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {SignalVsNoise} from "../src/SignalVsNoise.sol";

/// @notice Deploys SignalVsNoise. The CoFHE coprocessor (TaskManager) is a
///         predeployed system contract on supported testnets, so there are no
///         constructor args.
///
/// Usage:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url arbitrum_sepolia --broadcast --verify
contract Deploy is Script {
    function run() external returns (SignalVsNoise game) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        game = new SignalVsNoise();
        vm.stopBroadcast();
        console.log("SignalVsNoise deployed at:", address(game));
    }
}
