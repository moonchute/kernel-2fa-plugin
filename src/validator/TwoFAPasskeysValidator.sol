// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IValidator.sol";
import "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import "src/utils/KernelHelper.sol";
import "../factory/KernelFactory.sol";
import {Secp256r1} from "src/utils/EllipticCurveLibrary.sol";

struct PasskeysValidatorStorage {
  address owner;
  uint256 passkeysPublicKeyX;
  uint256 passkeysPublicKeyY;
  string origin;
  bytes authData;
}

struct EphemeralValidatorStorage {
  IKernelValidator validator;
  uint48 validAfter;
  uint48 validUntil;
}

contract TwoFAPasskeysValidator is IKernelValidator {
    event PassKeysAddressSet(
        address indexed kernel,
        address indexed owner,
        uint256 passKeysPublicKeyX,
        uint256 passKeysPublicKeyY
    );

    event EphemeralValidatorCreated(
        address indexed kernel,
        address indexed validator,
        uint48 validAfter,
        uint48 validUntil
    );
    
    mapping(address => PasskeysValidatorStorage) public passkeysValidatorStorage;
    mapping(address => EphemeralValidatorStorage) public ephemeraValidatorStorage;

    function disable(bytes calldata) external override {
        delete passkeysValidatorStorage[msg.sender];
    }

    function enable(bytes calldata _data) external override {
        address owner = address(bytes20(_data[0:20]));
        uint256 passkeysPublicKeyX = uint256(bytes32(_data[20:52]));
        uint256 passkeysPublicKeyY = uint256(bytes32(_data[52:84]));
        uint8 originLength = uint8(_data[84]);
        string memory origin = string(_data[85:85+originLength]);
        uint8 authDataLength = uint8(_data[85+originLength]);
        bytes memory authData = _data[86+originLength:86+originLength+authDataLength];
        passkeysValidatorStorage[msg.sender] = PasskeysValidatorStorage(
            owner,
            passkeysPublicKeyX,
            passkeysPublicKeyY,
            origin,
            authData
        );
        emit PassKeysAddressSet(msg.sender, owner, passkeysPublicKeyX, passkeysPublicKeyY);
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

        // ephemeral validator exists
        if (address(ephemeralValidator.validator) != address(0)){
            try ephemeralValidator.validator.validateUserOp(_userOp, _userOpHash, ephemeralValidator.validUntil) returns (uint256 res) {
                validationResult = res;
            } catch {
                validationResult = SIG_VALIDATION_FAILED;
            }
            ValidationData memory ephemeralValidationData = _parseValidationData(validationResult);
            if(ephemeralValidationData.aggregator == address(0)) {
                return _packValidationData(false, ephemeralValidator.validUntil, ephemeralValidator.validAfter);
            }
        }

        bytes memory sigByOwner = _userOp.signature[0:65];
        bytes calldata sigByPasskeys = _userOp.signature[65:129];

        address owner = passkeysValidatorStorage[_userOp.sender].owner;
        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        address recoveredOwner = ECDSA.recover(hash, sigByOwner);

        if (owner != recoveredOwner || !_validatePasskeysSignature(_userOp.sender, hash, sigByPasskeys)) {
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
        address owner = passkeysValidatorStorage[msg.sender].owner;
        bytes memory sigByOwner = signature[0:65];
        bytes calldata sigByPasskeys = signature[65:129];

        return owner == ECDSA.recover(hash, sigByOwner) && _validatePasskeysSignature(msg.sender, hash, sigByPasskeys) ? 0 : 1;
    }

    function _validatePasskeysSignature(address sender, bytes32 hash, bytes calldata signature) internal view returns (bool) {
        uint256 passkeysPubkeyX = passkeysValidatorStorage[sender].passkeysPublicKeyX;
        uint256 passkeysPubkeyY = passkeysValidatorStorage[sender].passkeysPublicKeyY;
        string storage origin = passkeysValidatorStorage[sender].origin;
        bytes storage authData = passkeysValidatorStorage[sender].authData;
        uint256 r = uint256(bytes32(signature[0:32]));
        uint256 s = uint256(bytes32(signature[32:64]));

        bytes memory encodeString = 
            abi.encodePacked(
                bytes('{"type":"webauthn.get",'),
                bytes('"challenge":"'),
                _convertBytes32ToStringLiteral(hash),
                bytes('","origin":"'),
                bytes(origin),
                bytes('","crossOrigin":'),
                bytes('false}')
            );
        bytes32 messageencodeHash = sha256(encodeString);
        bytes memory signatureBase = abi.encodePacked(authData, messageencodeHash);
        bytes32 signatureHash = sha256(signatureBase);
        return Secp256r1.Verify(uint256(signatureHash), [r, s], [passkeysPubkeyX, passkeysPubkeyY]);
    }

    function _convertBytes32ToStringLiteral (bytes32 hash) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            bytes1 char = bytes1(bytes32(hash << (8 * i)));
            bytesArray[i * 2] = _convertBytes1ToASCII(char >> 4);
            bytesArray[i * 2 + 1] =  _convertBytes1ToASCII(char & 0x0f);
        }
        return string(bytesArray);
    }

    function _convertBytes1ToASCII (bytes1 char) internal pure returns (bytes1) {
        return bytes1(uint8(char) > 9 ? uint8(char) + 87 : uint8(char) + 48);
    }
}