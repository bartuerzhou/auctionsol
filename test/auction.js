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
    it("should reject below minimum bid", async function () {
        const AuctionInstance = await Auction.deployed();
        const bider = accounts[0];
        const bider_before = web3.utils.toBN(await web3.eth.getBalance(bider));
        const auction_before = await AuctionInstance.getBalance.call();
        const bid = 555; // minimum is 999
        try {
            const res = await AuctionInstance.bidAuction(3, {
                value: bid,
                from: bider
            });
            throw res;
        } catch (e) {
            const expect_err = "revert min";
            const stack_head = e.data.stack.split('\n')[0].split(": ")[2];
            const bider_after = web3.utils.toBN(await web3.eth.getBalance(bider));
            const auction_after = await AuctionInstance.getBalance.call();
            const cost = bider_before.sub(bider_after);
            assert.equal(stack_head, expect_err, "throw min revert message");
            assert.equal(cost.toNumber(), 0, "bider balance untouched");
            assert.equal(auction_after - auction_before, 0, "contract balance untouched");
        }
    });
    it("should reject not best latest bid", async function () {
        const AuctionInstance = await Auction.deployed();
        const bider = accounts[4];
        const bider_before = web3.utils.toBN(await web3.eth.getBalance(bider));
        const auction_before = await AuctionInstance.getBalance.call();
        const bid = 1000; // best is 1002;
        try {
            const res = await AuctionInstance.bidAuction(2, {
                value: bid,
                from: bider
            });
            throw res;
        } catch (e) {
            const expect_err = "revert pay";
            const stack_head = e.data.stack.split('\n')[0].split(": ")[2];
            const bider_after = web3.utils.toBN(await web3.eth.getBalance(bider));
            const auction_after = await AuctionInstance.getBalance.call();
            const cost = bider_before.sub(bider_after);
            assert.equal(stack_head, expect_err, "throw pay revert message");
            assert.equal(cost.toNumber(), 0, "bider balance untouched");
            assert.equal(auction_after - auction_before, 0, "contract balance untouched");
        }
    });
    it("should settle down immediately on maximum bid", async function () {
        const AuctionInstance = await Auction.deployed();
        const bider = accounts[1];
        const holder = accounts[0];
        const receive_ether_addr = AuctionInstance.address;
        const gas_price = web3.utils.toBN(await web3.eth.getGasPrice());
        const bider_before = web3.utils.toBN(await web3.eth.getBalance(bider));
        const holder_before = web3.utils.toBN(await web3.eth.getBalance(holder));
        const auction_before = await AuctionInstance.getBalance.call();
        const bid = 9999999; // maximum price
        const res = await AuctionInstance.bidAuction(1, {
            value: bid,
            from: bider
        });
        const receipt_to = web3.utils.toChecksumAddress(res.receipt.to);
        const gas_used = web3.utils.toBN(res.receipt.cumulativeGasUsed);
        const bider_after = web3.utils.toBN(await web3.eth.getBalance(bider));
        const holder_after = web3.utils.toBN(await web3.eth.getBalance(holder));
        const auction_after = await AuctionInstance.getBalance.call();
        const earn = holder_after.sub(holder_before);
        const cost = bider_before.sub(bider_after);
        const gas = gas_used.mul(gas_price);
        const net = cost.sub(gas);
        const isSettleDown = await AuctionInstance.queryNFTOwner.call(1, accounts[1]);
        const originalHolder = await AuctionInstance.queryNFTOwner.call(1, accounts[0]);
        assert(isSettleDown, "NFT owner should be bider");
        assert(!originalHolder, "NFT original holder lost holding");
        assert.equal(earn.toNumber(), bid, "holder balance");
        assert.equal(net.toNumber(), bid, "bider balance");
        assert.equal(auction_after - auction_before, 0, "contract balance");
    });
    it("should settle down on highest bid when timeout", async function () {
        const AuctionInstance = await Auction.deployed();
        const holder = accounts[0];
        const bider_2nd = accounts[2];
        const bider_1st = accounts[3];
        const bider_max = accounts[4];
        const timeout_operator = accounts[5];
        const gas_price = web3.utils.toBN(await web3.eth.getGasPrice());
        const before_1st = web3.utils.toBN(await web3.eth.getBalance(bider_1st));
        const before_2nd = web3.utils.toBN(await web3.eth.getBalance(bider_2nd));
        const before_max = web3.utils.toBN(await web3.eth.getBalance(bider_max));
        const holder_before = web3.utils.toBN(await web3.eth.getBalance(holder));
        const auction_before = await AuctionInstance.getBalance.call();
        const bid_2 = 1000;
        const bid_1 = 1002;
        const bid_max = 9999999;
        const res_2 = await AuctionInstance.bidAuction(4, {
            value: bid_2,
            from: bider_2nd
        });
        const gas_used_2 = web3.utils.toBN(res_2.receipt.cumulativeGasUsed);
        const res_1 = await AuctionInstance.bidAuction(4, {
            value: bid_1,
            from: bider_1st
        });
        await AuctionInstance.removeTimeout({
            value: 0,
            from: timeout_operator
        });
        const timeout = await AuctionInstance.checkTimeout.call();
        assert(timeout, "timeout set to 0");
        const res_3 = await AuctionInstance.bidAuction(4, {
            value: bid_max,
            from: bider_max
        });
        const gas_used_3 = web3.utils.toBN(res_3.receipt.cumulativeGasUsed);
        const gas_used_1 = web3.utils.toBN(res_1.receipt.cumulativeGasUsed);
        const after_1st = web3.utils.toBN(await web3.eth.getBalance(bider_1st));
        const after_2nd = web3.utils.toBN(await web3.eth.getBalance(bider_2nd));
        const after_max = web3.utils.toBN(await web3.eth.getBalance(bider_max));
        const auction_after = await AuctionInstance.getBalance.call();
        const holder_after = web3.utils.toBN(await web3.eth.getBalance(holder));
        const cost_1st = before_1st.sub(after_1st);
        const gas_1st = gas_used_1.mul(gas_price);
        const net_1st = cost_1st.sub(gas_1st);
        const cost_2nd = before_2nd.sub(after_2nd);
        const gas_2nd = gas_used_2.mul(gas_price);
        const net_2nd = cost_2nd.sub(gas_2nd);
        const gas_max = gas_used_3.mul(gas_price);
        const cost_max = before_max.sub(after_max);
        const net_max = cost_max.sub(gas_max);
        const earn = holder_after.sub(holder_before);
        const isSettleDown = await AuctionInstance.queryNFTOwner.call(4, bider_1st);
        const originalHolder = await AuctionInstance.queryNFTOwner.call(4, holder);
        assert(isSettleDown, "NFT owner should be bider");
        assert(!originalHolder, "NFT original holder lost holding");
        assert.equal(net_1st.toNumber(), bid_1, "highest balance");
        assert.equal(net_2nd.toNumber(), 0, "second highest refund");
        assert.equal(auction_after - auction_before, 0, "contract balance");
        assert.equal(net_max.toNumber(), 0, "max after timeout refund");
        assert.equal(earn.toNumber(), bid_1, "holder balance");
    });

});