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

  const fromBlock = Math.max(latest - 20, 0)

  const logs = await provider.getLogs({
   address: FACTORY,
   fromBlock,
   toBlock: latest,
   topics: [topic]
  })

  const pools=[]

  logs.forEach(log=>{

   const parsed = iface.parseLog(log)

   pools.push({
    type:"uniswap_pool_created",
    token0: parsed.args.token0.toLowerCase(),
    token1: parsed.args.token1.toLowerCase(),
    pool: parsed.args.pool.toLowerCase()
   })

  })

  return pools

 }catch(e){

  console.log("Uniswap scan error:",e.message)

  return []

 }

}