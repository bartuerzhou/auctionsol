// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTToken is ERC1155, Ownable {
    address public selfaddr;

    constructor() ERC1155("http://{id}.json") onlyOwner {
        selfaddr = address(this);
    }

    function mintBatch(address holder, uint total) public {
        for (uint256 i = 0; i < total; i++) {
            _mint(holder, i + 1, 1, "");
            _setApprovalForAll(holder, msg.sender, true);
        }
    }
}

contract Auction is Ownable {
    address payable public receive_ether_addr;
    IERC1155 public nft;
    uint public aucNumber = 1;
    NFTToken private tok;

    constructor() {
        receive_ether_addr = payable(address(this));
        tok = new NFTToken();
        tok.mintBatch(msg.sender, 10);
        nft = IERC1155(address(tok));
        for (uint256 i = 0; i < 10; i++) {
            createAuction(
                msg.sender,
                tok.selfaddr(),
                i + 1,
                1,
                999,
                9999999,
                1200
            );
        }
    }

    /*
      TODO:business logic graph, settle down cases
      a) time out and biding
      b) time out and reclaim
      c) biding hit max, done immediately
    */

    struct AuctionItem {
        address seller;
        address nftAddr;
        uint min;
        uint max;
        uint id /* nft token id */;
        uint amount;
        uint time /* auction time out */;
        uint bestBid;
        address bestBidAddr;
        bool finished /* settle down */;
    }

    mapping(uint => AuctionItem) public auctions;

    function createAuction(
        address seller,
        address _nftAddr,
        uint id,
        uint amount,
        uint min,
        uint max,
        uint time
    ) public {
        require(msg.sender != address(0));
        if (max == 0) {
            max = 9999999999;
        }
        require(min > 0 && max > min && time > 0, "setting");
        nft.safeTransferFrom(seller, address(this), id, amount, "");
        auctions[aucNumber] = AuctionItem(
            msg.sender,
            _nftAddr,
            min,
            max,
            id,
            amount,
            block.timestamp + time,
            0,
            msg.sender,
            false
        );
        aucNumber++;
    }

    function transfer_ether(address to) public payable {
        payable(to).transfer(msg.value);
    }

    function getBalance() external view returns (uint) {
        return receive_ether_addr.balance;
    }

    event Received(address, uint);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function bidAuction(uint number) external payable {
        if (
            block.timestamp > auctions[number].time &&
            !auctions[number].finished
        ) {
            this.transfer_ether{value: msg.value}(msg.sender);
            finishAuction(number);
        } else {
            /* TODO: setup bug, only one and first bestBid */
            require(msg.value > auctions[number].min, "min");
            require(!auctions[number].finished, "finished");
            require(block.timestamp < auctions[number].time, "timeout");
            require(msg.value > auctions[number].bestBid, "pay");

            receive_ether_addr.transfer(msg.value);
            if (msg.value >= auctions[number].max) {
                auctions[number].bestBid = msg.value;
                auctions[number].bestBidAddr = msg.sender;
                finishAuction(number);
            } else {
                /* TODO: setup bug, refund ether when bestBid replaced */
                this.transfer_ether{value: auctions[number].bestBid}(
                    auctions[number].bestBidAddr
                );
                auctions[number].bestBid = msg.value;
                auctions[number].bestBidAddr = msg.sender;
            }
        }
    }

    function finishAuction(uint number) internal {
        auctions[number].finished = true;
        nft.safeTransferFrom(
            address(this),
            auctions[number].bestBidAddr,
            auctions[number].id,
            auctions[number].amount,
            ""
        );
        this.transfer_ether{value: auctions[number].bestBid}(
            auctions[number].seller
        );
    }

    function reclaimAuction(uint number) external payable {
        /* TODO: setup bug, reclaim with payment */
        require(msg.value == 0, "free");
        require(block.timestamp > auctions[number].time, "timeout");
        require(!auctions[number].finished, "finished");
        /* TODO: setup bug, reclaim seller check */
        require(auctions[number].seller == msg.sender, "owner");
        finishAuction(number);
    }

    function queryBid(uint i) external view returns (uint) {
        return auctions[i].bestBid;
    }

    /* unit test purpose */
    function queryNFTOwner(
        uint number,
        address owner
    ) external view returns (bool) {
        return nft.balanceOf(owner, number) > 0;
    }

    /* unit test purpose */
    /* not modify as payable can be called with payment from to change state */
    function removeTimeout(uint i) public payable {
        /* TODO: setup bug, require(msg.sender == auctions[i].seller, "owner")  */
        auctions[i].time = 0;
    }

    /* unit test purpose */
    function checkTimeout(uint i) public view returns (bool) {
        return block.timestamp > auctions[i].time;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure returns (bytes4) {
        require(operator != address(0), "operator");
        require(from != address(0), "from");
        require(id >= 0, "id");
        require(value == 1, "value");
        require(data.length >= 0, "data");
        return
            bytes4(
                keccak256(
                    "onERC1155Received(address,address,uint256,uint256,bytes)"
                )
            );
    }
}
