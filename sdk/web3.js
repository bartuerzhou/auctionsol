// node --experimental-modules web3.js
import Web3 from "web3";
import fs from "fs";
import process from "process";
// http://localhost:8545
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
    const add_res = await Contract.methods.add(2, 4).call();
    console.log(`add result : ${add_res}`);
    const noop_res = await Contract.methods.noop().call();
    console.log(`noop result : ${noop_res}`);
}

run();