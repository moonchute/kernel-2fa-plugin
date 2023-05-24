// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./KernelFactory.sol";
import "src/validator/TwofaValidator.sol";

contract TwofaKernelFactory {
    KernelFactory immutable public singletonFactory;
    TwofaValidator immutable public validator;

    constructor(KernelFactory _singletonFactory, TwofaValidator _validator) {
        singletonFactory = _singletonFactory;
        validator = _validator;
    }

    function createAccount(address _owner, address _twofa, uint256 _index) external returns (EIP1967Proxy proxy) {
        bytes memory data = abi.encodePacked(_owner, _twofa);
        proxy = singletonFactory.createAccount(validator, data, _index);
    }

    function getAccountAddress(address _owner, address _twofa, uint256 _index) public view returns (address) {
        bytes memory data = abi.encodePacked(_owner, _twofa);
        return singletonFactory.getAccountAddress(validator, data, _index);
    }
}
