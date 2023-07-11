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

struct EphemeralValidatorStorage {
  IKernelValidator validator;
  uint48 validAfter;
  uint48 validUntil;
}

contract TwoFAEmailValidator is IKernelValidator {
    event TwofaAddressSet(address indexed kernel, address indexed owner, address indexed twofaAddress);
    event EphemeralValidatorCreated(
        address indexed kernel,
        address indexed validator,
        uint48 validAfter,
        uint48 validUntil
    );

    mapping(address => TwofaValidatorStorage) public twofaValidatorStorage;
    mapping(address => EphemeralValidatorStorage) public ephemeraValidatorStorage;

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

    function createEphemeral(bytes calldata _data) external {
        address validator = address(bytes20(_data[0:20]));
        uint48 validAfter = uint48(bytes6(_data[20:26]));
        uint48 validUntil = uint48(bytes6(_data[26:32]));

        ephemeraValidatorStorage[msg.sender] = EphemeralValidatorStorage(
            IKernelValidator(validator),
            validAfter,
            validUntil
        );
        emit EphemeralValidatorCreated(msg.sender, validator, validAfter, validUntil);
    }

    function validateUserOp(UserOperation calldata _userOp, bytes32 _userOpHash, uint256)
        external
        override
        returns (uint256 validationData)
    {
        EphemeralValidatorStorage storage ephemeralValidator = ephemeraValidatorStorage[_userOp.sender];
        uint256 validationResult = 0;
        if (address(ephemeralValidator.validator) != address(0)){
            try ephemeralValidator.validator.validateUserOp(_userOp, _userOpHash, ephemeralValidator.validUntil) returns (uint256 res) {
                validationResult = res;
            } catch {
                validationResult = SIG_VALIDATION_FAILED;
            }
            ValidationData memory ephemeralValidationData = _parseValidationData(validationResult);
            if (ephemeralValidationData.aggregator == address(0)) {
                return _packValidationData(false, ephemeralValidator.validUntil, ephemeralValidator.validAfter);
            }
        }

        bytes memory sigByOwner = _userOp.signature[0:65];
        bytes memory sigByTwofa = _userOp.signature[65:130];
        address owner = twofaValidatorStorage[_userOp.sender].owner;
        address twofaAddress = twofaValidatorStorage[_userOp.sender].twofaAddress;

        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        address recoveredOwner = ECDSA.recover(hash, sigByOwner);
        address recoveredTwofa = ECDSA.recover(hash, sigByTwofa);
        
        if (owner != recoveredOwner || twofaAddress != recoveredTwofa) {
            return SIG_VALIDATION_FAILED;
        }
    }

    function validateSignature(bytes32 hash, bytes calldata signature) public view override returns (uint256) {
        EphemeralValidatorStorage storage ephemeralValidator = ephemeraValidatorStorage[msg.sender];
        uint256 validationResult = 0;

        // ephemeral validator exists
        if (address(ephemeralValidator.validator) != address(0)){
            try ephemeralValidator.validator.validateSignature(hash, signature) returns (uint256 res) {
                validationResult = res;
            } catch {
                validationResult = SIG_VALIDATION_FAILED;
            }
            ValidationData memory validationData = _parseValidationData(validationResult);
            if(validationData.aggregator == address(0)) {
                return _packValidationData(false, ephemeralValidator.validUntil, ephemeralValidator.validAfter);
            }
        }

        address owner = twofaValidatorStorage[msg.sender].owner;
        address twofa = twofaValidatorStorage[msg.sender].twofaAddress;
        bytes memory sigByOwner = signature[0:65];
        bytes memory sigByTwofa = signature[65:130];

        return owner == ECDSA.recover(hash, sigByOwner) && twofa == ECDSA.recover(hash, sigByTwofa) ? 0 : 1;
    }
}