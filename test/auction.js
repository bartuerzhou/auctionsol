const Auction = artifacts.require("Auction");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Auction", function ( /* accounts */ ) {

    it("should assert true", async function () {
        await Auction.deployed();
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

});