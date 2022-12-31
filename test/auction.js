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
        const cost = bider_before.sub(bider_after);
        const gas = gas_used.mul(gas_price);
        const net = cost.sub(gas);
        assert.equal(net.toNumber(), bid, "bider balance");
        assert.equal(auction_after - auction_before, bid, "contract balance");
        assert.equal(receipt_to, receive_ether_addr, "contract address on receipt");
    });
    it("should secound highest bid refund", async function () {
        const AuctionInstance = await Auction.deployed();
        const bider_2nd = accounts[2];
        const bider_1st = accounts[3];
        const gas_price = web3.utils.toBN(await web3.eth.getGasPrice());
        const before_1st = web3.utils.toBN(await web3.eth.getBalance(bider_1st));
        const before_2nd = web3.utils.toBN(await web3.eth.getBalance(bider_2nd));
        const auction_before = await AuctionInstance.getBalance.call();
        const bid_2 = 1000;
        const bid_1 = 1002;
        const res_2 = await AuctionInstance.bidAuction(2, {
            value: bid_2,
            from: bider_2nd
        });
        const gas_used_2 = web3.utils.toBN(res_2.receipt.cumulativeGasUsed);
        const res_1 = await AuctionInstance.bidAuction(2, {
            value: bid_1,
            from: bider_1st
        });
        const gas_used_1 = web3.utils.toBN(res_1.receipt.cumulativeGasUsed);
        const after_1st = web3.utils.toBN(await web3.eth.getBalance(bider_1st));
        const after_2nd = web3.utils.toBN(await web3.eth.getBalance(bider_2nd));
        const auction_after = await AuctionInstance.getBalance.call();
        const cost_1st = before_1st.sub(after_1st);
        const gas_1st = gas_used_1.mul(gas_price);
        const net_1st = cost_1st.sub(gas_1st);
        const cost_2nd = before_2nd.sub(after_2nd);
        const gas_2nd = gas_used_2.mul(gas_price);
        const net_2nd = cost_2nd.sub(gas_2nd);
        assert.equal(net_1st.toNumber(), bid_1, "highest balance");
        assert.equal(auction_after - auction_before, bid_1, "contract balance");
        assert.equal(net_2nd.toNumber(), 0, "second highest refund");
    });
});