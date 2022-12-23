// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract GameItem is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("GameItem", "ITM") {}

    /* session erc721 
    address p = address(0xaAD071ED2f9659350EF9dD259f605e805c387c8F);
    // why seturi consume so many gas?
    string memory u = "http://bazhou.blob.core.windows.net/learning/nft/sample.json
    GameItem g = new GameItem();
    g.test();
    g.tokenURI(0)
    */
    function safeMint(address to) public {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, "http://bazhou.blob.core.windows/net/NFT/1.json");
    }

    function test() public returns (uint) {
        address p = address(0xaAD071ED2f9659350EF9dD259f605e805c387c8F);
        safeMint(p);
        return _tokenIdCounter.current();
    }
}
