import { provider } from "../services/baseRpc.js"
import { ethers } from "ethers"

const iface = new ethers.Interface([
 "event PoolCreated(address token0,address token1,uint24 fee,int24 tickSpacing,address pool)"
])

export async function getNewPools(){

 const latest = await provider.getBlockNumber()

 const logs = await provider.getLogs({
  fromBlock: latest-20,
  toBlock: latest
 })

 let pools=[]

 logs.forEach(log => {

  try{

   const parsed = iface.parseLog(log)

   pools.push({
    token0: parsed.args.token0,
    token1: parsed.args.token1,
    pool: parsed.args.pool
   })

  }catch{}

 })

 return pools

}