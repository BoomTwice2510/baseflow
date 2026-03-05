import { ethers } from "ethers"

export const provider = new ethers.JsonRpcProvider(
 "https://mainnet.base.org"
)

export async function getGasPrice(){

 const fee = await provider.getFeeData()

 return Number(fee.gasPrice)

}