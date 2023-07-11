// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

contract SampleNFT is ERC721 {
    uint256 public tokenId = 0;

    constructor() ERC721("TestNFT", "TNFT") {}

    function mint(address _to) public {
        tokenId += 1;
        _mint(_to, tokenId);
    }
}
