// node --experimental-modules web3.js
import Web3 from "web3";
import fs from "fs";
import process from "process";
// subscribe event need websocket ws://localhost:8545
const web3 = new Web3(process.env.LOCAL_EVM_PROVIDER);

// truffle networks
const address = process.env.LOCAL_EVM_CONTRACT_ADDR;
const get_abi = async(json_file) => {
    const data = fs.readFileSync(json_file);
    return JSON.parse(data);
}

// Makefile at contracts folder
async function run() {
    const ABI = await get_abi(process.env.LOCAL_EVM_CONTRACT_ABI);
    const Contract = new web3.eth.Contract(ABI, address);
    const accounts = await web3.eth.getAccounts();
    const NFTID = 5;
    // bid API
    const bid_res = await Contract.methods.bidAuction(NFTID).send({
        value: 10212,
        from: accounts[1]
    });
    console.log(`bid to: ${bid_res.to}`);
    console.log(`bid gas: ${bid_res.gasUsed}`);
    console.log('bid Received event: ${Object.keys(bid_res.events.Received)}');
    await Contract.methods.removeTimeout(NFTID).send({
        from: accounts[8]
    });
    await Contract.methods.removeTimeout(NFTID).call();
    const timeout = await Contract.methods.checkTimeout(NFTID).call();
    console.log(`timeout: ${timeout}`);
    // reclaim API
    const reclaim_res = await Contract.methods.reclaimAuction(NFTID).send({
        from: accounts[0]
    });
    const reclaim = await Contract.methods.queryNFTOwner(NFTID, accounts[0]).call();
    console.log(`reclaim: ${reclaim}`);
    console.log(`reclaim to: ${reclaim_res.to}`);
    console.log(`reclaim gas: ${reclaim_res.gasUsed}`);
}

run();