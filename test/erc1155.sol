// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC1155, Ownable {
    address private owner_addr;

    uint256 public constant UNIQ_A = 1;
    uint256 public constant UNIQ_B = 2;

    constructor()
        ERC1155(
            "http://bazhou.blob.core.windows/net/NFT/ERC1155/MyToken/{id}.json"
        )
        onlyOwner
    {
        owner_addr = msg.sender;
    }

    function getAddr() public view returns (address) {
        return owner_addr;
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public {
        _mint(account, id, amount, data);
    }

    function test() external returns (uint, uint) {
        address p = address(0xaAD071ED2f9659350EF9dD259f605e805c387c8F);
        mint(p, UNIQ_A, 1, "");
        // mint(p, UNIQ_B, 1, "");
        return (balanceOf(p, UNIQ_A), balanceOf(p, UNIQ_B));
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public {
        _mintBatch(to, ids, amounts, data);
    }
}
