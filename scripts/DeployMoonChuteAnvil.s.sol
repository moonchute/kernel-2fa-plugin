pragma solidity ^0.8.0;

import {KernelFactory} from "src/factory/KernelFactory.sol";
import {SampleNFT} from "src/test//SampleNFT.sol";
import {VerifyingPaymaster} from "src/paymaster/VerifyingPaymaster.sol";
import {TwoFAEmailValidator} from "src/validator/TwoFAEmailValidator.sol";
import {TwoFAPasskeysValidator} from "src/validator/TwoFAPasskeysValidator.sol";
import {EphemeralPasskeysValidator} from "src/validator/EphemeralPasskeysValidator.sol";
import {ECDSAValidator} from "src/validator/ECDSAValidator.sol";

import "forge-std/Script.sol";
import "account-abstraction/core/EntryPoint.sol"; 

contract DeployMoonChute is Script {
    function run() public {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(key);
        EntryPoint entryPoint = new EntryPoint();
        KernelFactory factory = new KernelFactory(IEntryPoint(address(entryPoint)));
        SampleNFT sampleNFT = new SampleNFT();
        VerifyingPaymaster paymaster = new VerifyingPaymaster(entryPoint, vm.addr(key));
        TwoFAPasskeysValidator twofaPasskeysValidator = new TwoFAPasskeysValidator();
        TwoFAEmailValidator twofaEmailValidator = new TwoFAEmailValidator();
        EphemeralPasskeysValidator ephemeralValidator = new EphemeralPasskeysValidator();
        entryPoint.depositTo{value: 1000000000000000000}(address(paymaster));

        // paymaster account
        ECDSAValidator ecdsaValidator = new ECDSAValidator();
        address paymasterAccount = address(factory.createAccount(ecdsaValidator, abi.encodePacked(vm.addr(key)), 0));
        entryPoint.depositTo{value: 1000000000000000000}(paymasterAccount);

        vm.stopBroadcast();
    }
}

