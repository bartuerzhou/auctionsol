// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTToken is ERC1155, Ownable {
    address public selfaddr;

    uint256 public constant total = 8;

    constructor()
        ERC1155("http://bazhou.blob.core.windows.net/NFToken/{id}.json")
        onlyOwner
    {
        selfaddr = address(this);
    }

    function mintBatch(address[] memory owners) public {
        require(owners.length == total, "length");
        for (uint256 i = 0; i < owners.length; i++) {
            _mint(owners[i], i + 1, 1, "");
            _setApprovalForAll(owners[i], msg.sender, true);
        }
    }
}

contract Auction is Ownable {
    address payable receive_ether_addr;
    IERC1155 public nft;
    uint public aucNumber = 1;
    address[] public players = [
        0x857a663d5398CcBc047CE1Dfeae7274Cc488d51e,
        0x914B6156c7DAE787bFAF2AFddf6d809df9C08B10,
        0xF40130F8111Ebb7863353c88ca084459df5081cb,
        0xf58328Fcd87490eBdd6d0E1856D7BED353Ff732B,
        0xdf68a46bfC60Fba103628Da3d5AE511dfD971F26,
        0xdC0095Daed12F8f2703Fa9d5BaCc18D3d40B66eA,
        0x0aaC824304cD2F8E56a926b908142a234a198969,
        0x16127E492D5B4Af93919C93a226f81fC923b0E90
    ];
    NFTToken private tok;

    constructor() {
        receive_ether_addr = payable(address(this));
        tok = new NFTToken();
        tok.mintBatch(players);
        nft = IERC1155(address(tok));
        for (uint256 i = 0; i < players.length; i++) {
            createAuction(
                players[i],
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
    mapping(address => uint[]) public sellerAuctions;

    /* TODO:remove, test interface purpose */
    function add(uint a, uint b) public pure returns (uint) {
        return a + b;
    }

    /* TODO:remove test interface purpose */
    function noop() external pure returns (uint) {
        return 0;
    }

    function createAuction(
        address seller,
        address _nftAddr,
        uint id,
        uint amount,
        uint min,
        uint max,
        uint time
    ) public payable {
        require(msg.sender != address(0));
        if (max == 0) {
            max = 9999999999;
        }
        require(min > 0 && max > min && time > 0, "setting");
        nft = IERC1155(_nftAddr);
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
            address(0),
            false
        );
        sellerAuctions[seller].push(aucNumber);
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
            finishAuction(number);
        }

        /* TODO: setup bug, only one and first bestBid */
        require(!auctions[number].finished, "finished");
        require(block.timestamp < auctions[number].time);
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

    function finishAuction(uint number) internal {
        auctions[number].finished = true;
        nft = IERC1155(auctions[number].nftAddr);
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

    function doneAuction(uint number) external {
        require(block.timestamp > auctions[number].time, "finished");
        require(!auctions[number].finished, "settled");
        /* TODO: setup bug, reclaim seller check */
        require(auctions[number].seller == msg.sender, "owner");
        if (auctions[number].bestBid > 0) {
            /* trigger settle down */
            finishAuction(number);
        } else {
            /* TODO: setup bug, nobody bid, trigger NFT reclaim */
            nft = IERC1155(auctions[number].nftAddr);
            nft.safeTransferFrom(
                address(this),
                msg.sender,
                auctions[number].id,
                auctions[number].amount,
                ""
            );
        }
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
