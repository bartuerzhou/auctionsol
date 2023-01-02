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
    const accounts = await provider.listAccounts();
    const default_addr = await signer.getAddress();
    console.log(`accounts: ${accounts}`);
    console.log(`signer: ${default_addr}`);
    const isOwner = await contract.queryNFTOwner(2, default_addr);
    console.log(`isOwner ${isOwner}`);
    const tx = await contract.bidAuction(3, {
        value: ethers.utils.parseUnits("0.00001434", "gwei") // in wei
    });
    console.log(`to: ${tx.to}`);
    console.log(`gasPrice: ${tx.gasPrice}`);
    const bestBid = await contract.queryBid(3);
    console.log(`best bid on 3: ${bestBid}`);
}

createAuction();