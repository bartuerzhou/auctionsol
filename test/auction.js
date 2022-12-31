const Auction = artifacts.require("Auction");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Auction", function (accounts) {
    it("should assert true", async function () {
        return assert.isTrue(true);
    });
    it("should noop return 0", async function () {
        const AuctionInstance = await Auction.deployed();
        const noop_res = await AuctionInstance.noop.call();
        assert.equal(noop_res, 0);
    });
    it("should add return sum 40", async function () {
        const AuctionInstance = await Auction.deployed();
        const add_res = await AuctionInstance.add.call(17, 23);
        assert.equal(add_res, 40);
    });
    it("should bid be payable", async function () {
        const AuctionInstance = await Auction.deployed();
        const bider = accounts[1];
        const receive_ether_addr = AuctionInstance.address;
        const gas_price = web3.utils.toBN(await web3.eth.getGasPrice());
        const bider_before = web3.utils.toBN(await web3.eth.getBalance(bider));
        const auction_before = await AuctionInstance.getBalance.call();
        const bid = 1234;
        const res = await AuctionInstance.bidAuction(1, {
            value: bid,
            from: bider
        });
        const receipt_to = web3.utils.toChecksumAddress(res.receipt.to);
        const gas_used = web3.utils.toBN(res.receipt.cumulativeGasUsed);
        const bider_after = web3.utils.toBN(await web3.eth.getBalance(bider));
        const auction_after = await AuctionInstance.getBalance.call();
        assert.equal(bider_before.sub(bider_after).sub(gas_used.mul(gas_price)).toNumber(), bid);
        assert.equal(receipt_to, receive_ether_addr);
        assert.equal(auction_after - auction_before, bid);
    });

});