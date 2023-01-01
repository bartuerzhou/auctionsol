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
    const bid_res = await Contract.methods.bidAuction(1).send({
        value: 1015,
        from: accounts[1]
    });
    console.log(`to: ${bid_res.to}`);
    console.log(`gas: ${bid_res.gasUsed}`);
    console.log(`Received event: ${bid_res.events.Received.returnValues[0]} ${bid_res.events.Received.returnValues[1]}`);
    // await Contract.methods.removeTimeout();
    // await Contract.methods.bidAuction(1).send({
    //     value: 1015,
    //     from: accounts[1]
    // });
}

run();