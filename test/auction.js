const Auction = artifacts.require("Auction");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
async function get_gas_used(tx_res) {
    let hash = "";
    if (typeof (tx_res) == "string") {
        hash = tx_res;
    } else {
        hash = tx_res.receipt.transactionHash;
    }

    const receipt = await web3.eth.getTransactionReceipt(hash);
    const gas = web3.utils.toBN(receipt.cumulativeGasUsed);
    const price = web3.utils.toBN(receipt.effectiveGasPrice);
    return gas.mul(price);
}

async function get_ether_balance(addr) {
    return web3.utils.toBN(await web3.eth.getBalance(addr));
}

contract("Auction", function (accounts) {
    const bid = web3.utils.toWei("3", "ether");
    const bid_1 = web3.utils.toWei("5", "ether");
    const bid_2 = web3.utils.toWei("4", "ether");
    const bid_highest = web3.utils.toWei("9", "ether");;
    const bid_max = web3.utils.toWei("10", "ether");
    const bid_below_min = web3.utils.toWei("0.5", "ether"); // min is 1

    it("should deploy gas be small", async function () {
        const block = await web3.eth.getBlock('latest');
        const txhash = block.transactions[block.transactions.length - 1];
        const gas = await get_gas_used(txhash);
        const deployed_gas = web3.utils.fromWei(gas);
        console.log(`deploy gas: ${deployed_gas} ether`);
        return assert(deployed_gas < 0.02, "deployed gas should be less than 0.02 ethers");
    });

    it("should bid be payable", async function () {
        const AuctionInstance = await Auction.deployed();
        const bidder = accounts[1];
        const receive_ether_addr = AuctionInstance.address;
        const bidder_before = await get_ether_balance(bidder);
        const auction_before = await AuctionInstance.getBalance.call();
        const res = await AuctionInstance.bidAuction(1, {
            value: bid,
            from: bidder
        });

        const receipt_to = web3.utils.toChecksumAddress(res.receipt.to);
        const gas_used = await get_gas_used(res);
        const bidder_after = await get_ether_balance(bidder);
        const auction_after = await AuctionInstance.getBalance.call();
        const cost = bidder_before.sub(bidder_after);
        const net = cost.sub(gas_used);
        assert.equal(net.toString(), bid, "bidder balance");
        assert.equal(auction_after - auction_before, bid, "contract balance");
        assert.equal(receipt_to, receive_ether_addr, "contract address on receipt");
    });

    it("should secound highest bid refund", async function () {
        const AuctionInstance = await Auction.deployed();
        const bidder_2nd = accounts[2];
        const bidder_1st = accounts[3];
        const before_1st = await get_ether_balance(bidder_1st);
        const before_2nd = await get_ether_balance(bidder_2nd);
        const auction_before = await AuctionInstance.getBalance.call();
        const res_2 = await AuctionInstance.bidAuction(2, {
            value: bid_2,
            from: bidder_2nd
        });
        const gas_used_2 = await get_gas_used(res_2);
        const res_1 = await AuctionInstance.bidAuction(2, {
            value: bid_1,
            from: bidder_1st
        });
        const gas_used_1 = await get_gas_used(res_1);
        const after_1st = await get_ether_balance(bidder_1st);
        const after_2nd = await get_ether_balance(bidder_2nd);
        const auction_after = await AuctionInstance.getBalance.call();
        const cost_1st = before_1st.sub(after_1st);
        const net_1st = cost_1st.sub(gas_used_1);
        const cost_2nd = before_2nd.sub(after_2nd);
        const net_2nd = cost_2nd.sub(gas_used_2);
        assert.equal(net_1st.toString(), bid_1, "highest balance");
        assert.equal(auction_after - auction_before, bid_1, "contract balance");
        assert.equal(net_2nd.toNumber(), 0, "second highest refund");
    });

    it("should reject below minimum bid", async function () {
        const AuctionInstance = await Auction.deployed();
        const bidder = accounts[0];
        const bidder_before = await get_ether_balance(bidder);
        const auction_before = await AuctionInstance.getBalance.call();
        try {
            const res = await AuctionInstance.bidAuction(3, {
                value: bid_below_min,
                from: bidder
            });
            throw res;
        } catch (e) {
            const expect_err = "min";
            const stack_head = e.data.reason;
            const bidder_after = await get_ether_balance(bidder);
            const auction_after = await AuctionInstance.getBalance.call();
            const cost = bidder_before.sub(bidder_after);
            assert.equal(stack_head, expect_err, "throw min revert message");
            assert.equal(cost.toNumber(), 0, "bidder balance untouched");
            assert.equal(auction_after - auction_before, 0, "contract balance untouched");
        }
    });

    it("should reject not best latest bid", async function () {
        const AuctionInstance = await Auction.deployed();
        const bidder = accounts[4];
        const bidder_before = await get_ether_balance(bidder);
        const auction_before = await AuctionInstance.getBalance.call();
        try {
            const res = await AuctionInstance.bidAuction(2, {
                value: bid,
                from: bidder
            });
            throw res;
        } catch (e) {
            const expect_err = "pay";
            const stack_head = e.data.reason;
            const bidder_after = await get_ether_balance(bidder);
            const auction_after = await AuctionInstance.getBalance.call();
            const cost = bidder_before.sub(bidder_after);
            assert.equal(stack_head, expect_err, "throw pay revert message");
            assert.equal(cost.toNumber(), 0, "bidder balance untouched");
            assert.equal(auction_after - auction_before, 0, "contract balance untouched");
        }
    });

    it("should settle down immediately on maximum bid", async function () {
        const AuctionInstance = await Auction.deployed();
        const bidder = accounts[1];
        const holder = accounts[0];
        const receive_ether_addr = AuctionInstance.address;
        const bidder_before = await get_ether_balance(bidder);
        const holder_before = await get_ether_balance(holder);
        const auction_before = await AuctionInstance.getBalance.call();
        const refund = web3.utils.toBN(bid); // case 1 refund
        const res = await AuctionInstance.bidAuction(1, {
            value: bid_max,
            from: bidder
        });
        const gas_used = await get_gas_used(res);
        const bidder_after = await get_ether_balance(bidder);
        const holder_after = await get_ether_balance(holder);
        const auction_after = await AuctionInstance.getBalance.call();
        const earn = holder_after.sub(holder_before);
        const cost = bidder_before.sub(bidder_after);
        const net = cost.sub(gas_used).add(refund);
        const isSettleDown = await AuctionInstance.queryNFTOwner.call(1, accounts[1]);
        const originalHolder = await AuctionInstance.queryNFTOwner.call(1, accounts[0]);
        assert(isSettleDown, "NFT owner is bidder");
        assert(!originalHolder, "NFT original holder lost holding");
        assert.equal(earn.toString(), bid_max, "holder balance");
        assert.equal(net.toString(), bid_max, "bidder balance");
        assert.equal(auction_after - auction_before, refund.neg(), "contract balance");
    });

    it("should settle down on highest bid when timeout", async function () {
        const AuctionInstance = await Auction.deployed();
        const holder = accounts[0];
        const bidder_2nd = accounts[2];
        const bidder_1st = accounts[3];
        const bidder_max = accounts[4];
        const timeout_operator = accounts[5];
        const before_1st = await get_ether_balance(bidder_1st);
        const before_2nd = await get_ether_balance(bidder_2nd);
        const before_max = await get_ether_balance(bidder_max);
        const holder_before = await get_ether_balance(holder);
        const auction_before = await AuctionInstance.getBalance.call();
        const res_2 = await AuctionInstance.bidAuction(5, {
            value: bid_2,
            from: bidder_2nd
        });
        const gas_used_2 = await get_gas_used(res_2);
        const res_1 = await AuctionInstance.bidAuction(5, {
            value: bid_1,
            from: bidder_1st
        });
        await AuctionInstance.removeTimeout(5, {
            value: 0,
            from: timeout_operator
        });
        const timeout = await AuctionInstance.checkTimeout.call(5);
        assert(timeout, "timeout set to 0");
        const res_3 = await AuctionInstance.bidAuction(5, {
            value: bid_highest,
            from: bidder_max
        });
        const gas_used_3 = await get_gas_used(res_3);
        const gas_used_1 = await get_gas_used(res_1);
        const after_1st = await get_ether_balance(bidder_1st);
        const after_2nd = await get_ether_balance(bidder_2nd);
        const after_max = await get_ether_balance(bidder_max);
        const auction_after = await AuctionInstance.getBalance.call();
        const holder_after = await get_ether_balance(holder);
        const cost_1st = before_1st.sub(after_1st);
        const net_1st = cost_1st.sub(gas_used_1);
        const cost_2nd = before_2nd.sub(after_2nd);
        const net_2nd = cost_2nd.sub(gas_used_2);
        const cost_max = before_max.sub(after_max);
        const net_max = cost_max.sub(gas_used_3);
        const earn = holder_after.sub(holder_before);
        const isSettleDown = await AuctionInstance.queryNFTOwner.call(5, bidder_1st);
        const originalHolder = await AuctionInstance.queryNFTOwner.call(5, holder);
        assert(isSettleDown, "NFT owner is bidder");
        assert(!originalHolder, "NFT original holder lost holding");
        assert.equal(net_1st.toString(), bid_1, "highest balance");
        assert.equal(net_2nd.toNumber(), 0, "second highest refund");
        assert.equal(auction_after - auction_before, 0, "contract balance");
        assert.equal(net_max.toNumber(), 0, "max after timeout refund");
        assert.equal(earn.toString(), bid_1, "holder balance");
    });

    it("should reclaim", async function () {
        const AuctionInstance = await Auction.deployed();
        const holder = accounts[0];
        const timeout_operator = accounts[4];
        await AuctionInstance.removeTimeout(4, {
            value: 0,
            from: timeout_operator
        });
        const timeout = await AuctionInstance.checkTimeout.call(4);
        assert(timeout, "timeout set to 0");
        const holder_before = await get_ether_balance(holder);
        const res = await AuctionInstance.reclaimAuction(4);
        const gas_used = await get_gas_used(res);
        const holder_after = await get_ether_balance(holder);
        const isReclaimed = await AuctionInstance.queryNFTOwner.call(4, holder);
        const cost = holder_before.sub(holder_after);
        const net = cost.sub(gas_used);
        assert.equal(net.toNumber(), 0, "holder balance");
        assert(isReclaimed, "holder reclaim");
    });

    it("should settle down highest bid when reclaim", async function () {
        const AuctionInstance = await Auction.deployed();
        const holder = accounts[0];
        const bidder = accounts[7];
        const holder_before = await get_ether_balance(holder);
        const bidder_before = await get_ether_balance(bidder);
        const auction_before = await AuctionInstance.getBalance.call();
        const res = await AuctionInstance.bidAuction(6, {
            value: bid_highest,
            from: bidder
        });
        const timeout_operator = accounts[6];
        await AuctionInstance.removeTimeout(6, {
            value: 0,
            from: timeout_operator
        });
        const timeout = await AuctionInstance.checkTimeout.call(6);
        assert(timeout, "timeout set to 0");
        const res_done = await AuctionInstance.reclaimAuction(6);
        const gas_used_done = await get_gas_used(res_done);
        const holder_after = await get_ether_balance(holder);
        const bidder_after = await get_ether_balance(bidder);
        const auction_after = await AuctionInstance.getBalance.call();
        const cost_done = holder_before.sub(holder_after);
        const net_done = cost_done.sub(gas_used_done);
        const gas_used = await get_gas_used(res);
        const cost = bidder_before.sub(bidder_after);
        const net = cost.sub(gas_used);
        const isSettleDown = await AuctionInstance.queryNFTOwner.call(6, bidder);
        const isReclaimed = await AuctionInstance.queryNFTOwner.call(6, holder);
        assert.equal(net.toString(), bid_highest, "bidder balance");
        assert(net_done.eq(web3.utils.toBN(bid_highest).neg()), "holder balance");
        assert.equal(auction_after - auction_before, 0, "contract balance");
        assert(!isReclaimed, "not reclaim");
        assert(isSettleDown, "settle down");
    });

    it("should reject reclaim on finished", async function () {
        const AuctionInstance = await Auction.deployed();
        await AuctionInstance.removeTimeout(4, {
            value: 0
        });
        const timeout = await AuctionInstance.checkTimeout.call(4);
        assert(timeout, "timeout set to 0");
        try {
            const res_done = await AuctionInstance.reclaimAuction(4);
            throw res_done;
        } catch (e) {
            const expect_err = "finished";
            const stack_head = e.data.reason;
            assert.equal(stack_head, expect_err, "throw finished revert message");
        };
    });

    it("should reject reclaim before timeout", async function () {
        const AuctionInstance = await Auction.deployed();
        try {
            const res_done = await AuctionInstance.reclaimAuction(7);
            throw res_done;
        } catch (e) {
            const expect_err = "timeout";
            const stack_head = e.data.reason;
            assert.equal(stack_head, expect_err, "throw timeout revert message");
        };
    });
});