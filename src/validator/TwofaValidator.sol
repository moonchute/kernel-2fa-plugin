// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IValidator.sol";
import "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import "src/utils/KernelHelper.sol";
import "../factory/KernelFactory.sol";

struct TwofaValidatorStorage {
  address owner;
  address twofaAddress;
}

contract TwofaValidator is IKernelValidator {
    event TwofaAddressSet(address indexed kernel, address indexed owner, address indexed twofaAddress);
    
    mapping(address => TwofaValidatorStorage) public twofaValidatorStorage;

    function disable(bytes calldata) external override {
        delete twofaValidatorStorage[msg.sender];
    }

    function enable(bytes calldata _data) external override {
        address owner = address(bytes20(_data[0:20]));
        address twofaAddress = address(bytes20(_data[20:40]));
        twofaValidatorStorage[msg.sender] = TwofaValidatorStorage(
            owner,
            twofaAddress
        );
        emit TwofaAddressSet(msg.sender, owner, twofaAddress);
    }

    function validateUserOp(UserOperation calldata _userOp, bytes32 _userOpHash, uint256)
        external
        view
        override
        returns (uint256 validationData)
    {
        bytes memory sigByOwner = _userOp.signature[0:65];
        bytes memory sigByTwofa = _userOp.signature[65:130];
        address owner = twofaValidatorStorage[_userOp.sender].owner;
        address twofaAddress = twofaValidatorStorage[_userOp.sender].twofaAddress;
        if (owner == ECDSA.recover(_userOpHash, sigByOwner) && twofaAddress == ECDSA.recover(_userOpHash, sigByTwofa)) {
            return 0;
        }

        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        address recoveredOwner = ECDSA.recover(hash, sigByOwner);
        address recoveredTwofa = ECDSA.recover(hash, sigByTwofa);
        if (owner != recoveredOwner || twofaAddress != recoveredTwofa) {
            return SIG_VALIDATION_FAILED;
        }
    }

    function validateSignature(bytes32 hash, bytes calldata signature) public view override returns (uint256) {
        address owner = twofaValidatorStorage[msg.sender].owner;
        address twofa = twofaValidatorStorage[msg.sender].twofaAddress;
        bytes memory sigByOwner = signature[0:65];
        bytes memory sigByTwofa = signature[65:130];

        return owner == ECDSA.recover(hash, sigByOwner) && twofa == ECDSA.recover(hash, sigByTwofa) ? 0 : 1;
    }
}