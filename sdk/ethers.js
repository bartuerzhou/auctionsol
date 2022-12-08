import fs from "fs";
import process from "process";
import {
    ethers
}
from "ethers";

const provider = new ethers.providers.JsonRpcProvider(process.env.LOCAL_EVM_PROVIDER);
const signer = ethers.Wallet.fromMnemonic(process.env.LOCAL_EVM_WALLET_MNEMONIC).connect(provider);
const address = process.env.LOCAL_EVM_CONTRACT_ADDR;
const get_abi = async(json_file) => {
    const data = fs.readFileSync(json_file);
    return JSON.parse(data);
}

async function createAuction() {
    const ABI = await get_abi(process.env.LOCAL_EVM_CONTRACT_ABI);
    const contract = new ethers.Contract(address, ABI, signer);

    const add_res = await contract.functions.add(2, 4);
    console.log(`add result : ${add_res}`);

    const noop_res = await contract.functions.noop();
    console.log(`noop result : ${noop_res}`);
}

createAuction();