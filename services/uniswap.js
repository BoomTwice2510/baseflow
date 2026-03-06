import { provider } from "../services/baseRpc.js"
import { ethers } from "ethers"

const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"

const iface = new ethers.Interface([
 "event PoolCreated(address indexed token0,address indexed token1,uint24 fee,int24 tickSpacing,address pool)"
])

const topic = iface.getEvent("PoolCreated").topicHash

export async function getNewPools(){

 try{

  const latest = await provider.getBlockNumber()

  const logs = await provider.getLogs({
   address: FACTORY,
   fromBlock: latest-20,
   toBlock: latest,
   topics: [topic]
  })

  const pools=[]

  logs.forEach(log=>{

   const parsed = iface.parseLog(log)

   pools.push({
    type:"new_pool",
    token0: parsed.args.token0,
    token1: parsed.args.token1,
    pool: parsed.args.pool
   })

  })

  return pools

 }catch(e){

  console.log("Uniswap scan error:",e.message)

  return []

 }

}