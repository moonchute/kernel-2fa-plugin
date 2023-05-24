// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

import "src/factory/EIP1967Proxy.sol";
import "src/factory/KernelFactory.sol";
import "src/factory/TwofaKernelFactory.sol";
import "src/validator/TwofaValidator.sol";
// test artifacts
import "src/test/TestERC721.sol";
// test utils
import {ERC4337Utils} from "./ERC4337Utils.sol";

using ERC4337Utils for EntryPoint;

contract TwofaValidatorTest is Test {
    Kernel public kernel;
    KernelFactory public factory;
    TwofaKernelFactory public twofaFactory;

    EntryPoint public entryPoint;
    TwofaValidator public validator;
    address public owner;
    uint256 public ownerKey;
    address public twofa;
    uint256 public twofaKey;
    address payable public beneficiary;

    function setUp() public {
        (owner, ownerKey) = makeAddrAndKey("owner");
        (twofa, twofaKey) = makeAddrAndKey("twofa");
        entryPoint = new EntryPoint();
        factory = new KernelFactory(entryPoint);
        validator = new TwofaValidator();

        twofaFactory = new TwofaKernelFactory(factory, validator);

        kernel = Kernel(payable(address(twofaFactory.createAccount(owner, twofa, 0))));
        vm.deal(address(kernel), 1e30);
        beneficiary = payable(address(makeAddr("beneficiary")));
        // disabled all mode except default validator
        UserOperation[] memory ops = new UserOperation[](1);
        UserOperation memory op = entryPoint.fillUserOp(
            address(kernel), abi.encodeWithSelector(KernelStorage.disableMode.selector, bytes4(0xffffffff))
        );
        op.signature = abi.encodePacked(bytes4(0x00000000), entryPoint.signUserOpHash(vm, ownerKey, op), entryPoint.signUserOpHash(vm, twofaKey, op));
        ops[0] = op; 
        entryPoint.handleOps(ops, beneficiary);
    }

    function test_revert_not_mode_0() public {
        UserOperation[] memory ops = new UserOperation[](1);
        UserOperation memory op = entryPoint.fillUserOp(
            address(kernel), abi.encodeWithSelector(KernelStorage.disableMode.selector, bytes4(0xffffffff))
        );

        // revert mode 1
        op.signature = abi.encodePacked(bytes4(0x00000001), entryPoint.signUserOpHash(vm, ownerKey, op), entryPoint.signUserOpHash(vm, twofaKey, op));
        ops[0] = op;
        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPoint.FailedOp.selector, 0, string.concat("AA23 reverted: ", "kernel: mode disabled")
            )
        );
        entryPoint.handleOps(ops, beneficiary);

        // revert mode 2
        op.signature = abi.encodePacked(bytes4(0x00000002), entryPoint.signUserOpHash(vm, ownerKey, op), entryPoint.signUserOpHash(vm, twofaKey, op));
        ops[0] = op; 
        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPoint.FailedOp.selector, 0, string.concat("AA23 reverted: ", "kernel: mode disabled")
            )
        );
        entryPoint.handleOps(ops, beneficiary);
    }

    function test_revert_without_2fa() public {
        UserOperation[] memory ops = new UserOperation[](1);
        UserOperation memory op = entryPoint.fillUserOp(
            address(kernel), abi.encodeWithSelector(KernelStorage.disableMode.selector, bytes4(0xffffffff))
        );
        // only signed by owner
        op.signature = abi.encodePacked(bytes4(0x00000000), entryPoint.signUserOpHash(vm, ownerKey, op), entryPoint.signUserOpHash(vm, ownerKey, op));
        ops[0] = op;
        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPoint.FailedOp.selector, 0, string.concat("AA23 reverted: ", "account: different aggregator")
            )
        );
        entryPoint.handleOps(ops, beneficiary);

        // not signed by 2fa key
        op.signature = abi.encodePacked(bytes4(0x00000000), entryPoint.signUserOpHash(vm, ownerKey, op));
        ops[0] = op;
        vm.expectRevert(
            abi.encodeWithSelector(
                IEntryPoint.FailedOp.selector, 0, string.concat("AA23 reverted (or OOG)")
            )
        );
        entryPoint.handleOps(ops, beneficiary);
    }

    function test_2fa() public {
        TestERC721 erc721 = new TestERC721();
        erc721.mint(address(kernel), 0);

        UserOperation[] memory ops = new UserOperation[](1);
        UserOperation memory op = entryPoint.fillUserOp(
            address(kernel), abi.encodeWithSelector(Kernel.execute.selector, address(erc721), 0, abi.encodeWithSelector(ERC721.transferFrom.selector, address(kernel), address(owner), 0), 0)
        );

        op.signature = abi.encodePacked(bytes4(0x00000000), entryPoint.signUserOpHash(vm, ownerKey, op), entryPoint.signUserOpHash(vm, twofaKey, op));
        ops[0] = op;
        entryPoint.handleOps(ops, beneficiary);
        assertEq(erc721.ownerOf(0), address(owner));
    }
}