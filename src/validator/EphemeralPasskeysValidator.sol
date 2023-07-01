// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IValidator.sol";
import "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import "src/utils/KernelHelper.sol";
import "../factory/KernelFactory.sol";
import {Secp256r1} from "src/utils/EllipticCurveLibrary.sol";

struct PasskeysValidatorStorage {
  uint256 passkeysPublicKeyX;
  uint256 passkeysPublicKeyY;
}

contract PasskeysValidator is IKernelValidator {
    event PassKeysAddressSet(
        address indexed kernel,
        uint256 passKeysPublicKeyX,
        uint256 passKeysPublicKeyY
    );
    
    mapping(address => PasskeysValidatorStorage) public passkeysValidatorStorage;

    function disable(bytes calldata) external override {
        delete passkeysValidatorStorage[msg.sender];
    }

    function enable(bytes calldata _data) external override {
        uint256 passkeysPublicKeyX = uint256(bytes32(_data[0:32]));
        uint256 passkeysPublicKeyY = uint256(bytes32(_data[32:64]));
        passkeysValidatorStorage[msg.sender] = PasskeysValidatorStorage(
            passkeysPublicKeyX,
            passkeysPublicKeyY
        );
        emit PassKeysAddressSet(msg.sender, passkeysPublicKeyX, passkeysPublicKeyY);
    }

    function validateUserOp(UserOperation calldata _userOp, bytes32 _userOpHash, uint256)
        external
        view
        override
        returns (uint256 validationData)
    {
        bytes calldata sigByPasskeys = _userOp.signature[0:64];
        uint8 originLength = uint8(_userOp.signature[64]);
        string calldata origin = string(_userOp.signature[65:65+originLength]);
        uint8 authDataLength = uint8(_userOp.signature[65+originLength]);
        bytes calldata authData = _userOp.signature[66+originLength:66+originLength+authDataLength];
       
        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        if (!_validatePasskeysSignature(_userOp.sender, hash, sigByPasskeys, origin, authData)) {
            return SIG_VALIDATION_FAILED;
        }
    }

    function validateSignature(bytes32 hash, bytes calldata signature) public view override returns (uint256) {
        bytes calldata sigByPasskeys = signature[0:64];
        uint8 originLength = uint8(signature[64]);
        string calldata origin = string(signature[65:65+originLength]);
        uint8 authDataLength = uint8(signature[65+originLength]);
        bytes calldata authData = signature[66+originLength:66+originLength+authDataLength];
       
        return _validatePasskeysSignature(msg.sender, hash, sigByPasskeys, origin, authData) ? 0 : 1;
    }

    function _validatePasskeysSignature(
        address sender, 
        bytes32 hash, 
        bytes calldata signature,
        string calldata origin,
        bytes calldata authData
    ) internal view returns (bool) {
        uint256 passkeysPubkeyX = passkeysValidatorStorage[sender].passkeysPublicKeyX;
        uint256 passkeysPubkeyY = passkeysValidatorStorage[sender].passkeysPublicKeyY;
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