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
    NFTToken private tok;

    constructor() {
        receive_ether_addr = payable(address(this));
        tok = new NFTToken();
        tok.mintBatch(msg.sender, 5);
        nft = IERC1155(address(tok));
        for (uint256 i = 0; i < 5; i++) {
            createAuction(
                msg.sender,
                tok.selfaddr(),
                i + 1 /* tokid == aucid */,
                1 * 10 ** 18,
                10 * 10 ** 18,
                1200
            );
        }
    }

    /*

    +--------------------{ Logic Coverage Map }-------------------+    


             TIME
               ^                                
               |                                
               |rrrrr|$$$$$$$$$$$                +---legend----+
               |rr5rr|$$$$$4$$$$$                | r : reclaim |
               |rrrrr|$$$$$$$$$$$                | $ : settle  |
     [timeout] +-----+-----+-----                | x : reject  |
               |xxxxx|bbbbb|$$$$$                | b : bid     |
               |xx2xx|bb1bb|$$3$$                +---legend----+
               |xxxxx|bbbbb|$$$$$ 
               +-----+-----+-------> PRICE
                   [min] [max]

     +----------------- [Region Unit Test Map]--------------------+
                             
               1: - bid be payable
                  - secound highest bid refund
                  - reject not best latest bid
               2: - reject below minimum bid
               3: - settle down immediately on maximum bid
               4: - settle down on highest bid when timeout
                  - settle down highest bid when reclaim
               5: - reclaim
                  - reject reclaim on finished
                  - reject reclaim before timeout

    */

    struct AuctionItem {
        address seller;
        address nftAddr /* for create IERC1155 */;
        uint min /* minimum price, reject below */;
        uint max /* maximum price, settle immediately */;
        uint id /* nft token id */;
        uint amount /* most ntf token be 1 */;
        uint time /* auction time out */;
        uint bestBid;
        address bestBidAddr /* best bidder address */;
        bool finished /* settle down or reclaim */;
    }

    mapping(uint => AuctionItem) public auctions;

    function createAuction(
        address seller,
        address _nftAddr,
        uint tokid,
        uint min,
        uint max,
        uint time
    ) public {
        require(msg.sender != address(0));
        if (max == 0) {
            max = 9999999999;
        }
        require(min > 0 && max > min && time > 0, "setting");
        nft.safeTransferFrom(seller, address(this), tokid, 1, "");
        auctions[tokid] = AuctionItem(
            msg.sender,
            _nftAddr,
            min,
            max,
            tokid,
            1,
            block.timestamp + time,
            0,
            msg.sender,
            false
        );
    }

    /*

    +----------------------{ Paymet Table }----------------------+
    |   stage   |   seller  |contract|  bidder   |   comments    |
    +-----------+-----------+--------+-----------+---------------+
    |           (token)                            constructor   |
    | create    (token)                            NFTToken      |  
    |           (token) >>> [contract]             mintBatch     |
    |           (token) >>> [contract]             createAuction |
    +-----------+-----------+--------+-----------+---------------+
    |                       [contract] <<< (ether) bidAuction    |
    |   bid                 [contract] >>> (ether) transfer_ether|       
    |                       [contract] <<< (ether) transfer      |
    |                       [contract] >>> (ether) refund second |
    |                       [contract] xxx (ether) min reject    | 
    +-----------+-----------+--------+-----------+---------------+ [timeout]
    |           (ether) <<< [contract] >>> (token) finishAuction |
    |  settle   (token) <<< [contract]             reclaimAuction| 
    +------------------------------------------------------------+

    */
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

    function bidAuction(uint tokid) external payable {
        if (
            block.timestamp > auctions[tokid].time && !auctions[tokid].finished
        ) {
            this.transfer_ether{value: msg.value}(msg.sender);
            finishAuction(tokid);
        } else {
            /* TODO: setup bug, only one and first bestBid */
            require(msg.value > auctions[tokid].min, "min");
            require(!auctions[tokid].finished, "finished");
            require(block.timestamp < auctions[tokid].time, "timeout");
            require(msg.value > auctions[tokid].bestBid, "pay");

            receive_ether_addr.transfer(msg.value);
            this.transfer_ether{value: auctions[tokid].bestBid}(
                auctions[tokid].bestBidAddr
            );
            if (msg.value >= auctions[tokid].max) {
                auctions[tokid].bestBid = msg.value;
                auctions[tokid].bestBidAddr = msg.sender;
                finishAuction(tokid);
            } else {
                /* TODO: setup bug, refund ether when bestBid replaced */
                auctions[tokid].bestBid = msg.value;
                auctions[tokid].bestBidAddr = msg.sender;
            }
        }
    }

    function finishAuction(uint tokid) internal {
        auctions[tokid].finished = true;
        nft.safeTransferFrom(
            address(this),
            auctions[tokid].bestBidAddr,
            auctions[tokid].id,
            auctions[tokid].amount,
            ""
        );
        this.transfer_ether{value: auctions[tokid].bestBid}(
            auctions[tokid].seller
        );
    }

    function reclaimAuction(uint tokid) external payable {
        /* TODO: setup bug, reclaim with payment */
        require(msg.value == 0, "free");
        require(!auctions[tokid].finished, "finished");
        require(block.timestamp > auctions[tokid].time, "timeout");
        /* TODO: setup bug, reclaim seller check */
        require(auctions[tokid].seller == msg.sender, "owner");
        finishAuction(tokid);
    }

    function queryBid(uint tokid) external view returns (uint) {
        return auctions[tokid].bestBid;
    }

    /* unit test purpose */
    function queryNFTOwner(
        uint tokiid,
        address owner
    ) external view returns (bool) {
        return nft.balanceOf(owner, tokiid) > 0;
    }

    /* unit test purpose */
    /* not modify as payable can be called with payment from to change state */
    function removeTimeout(uint tokid) public payable {
        /* TODO: setup bug, require(msg.sender == auctions[i].seller, "owner")  */
        auctions[tokid].time = 0;
    }

    /* unit test purpose */
    function checkTimeout(uint tokid) public view returns (bool) {
        return block.timestamp > auctions[tokid].time;
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
