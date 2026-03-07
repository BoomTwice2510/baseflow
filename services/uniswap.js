import { provider } from "../services/baseRpc.js"
import { ethers } from "ethers"

const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"

const iface = new ethers.Interface([
 "event PoolCreated(address indexed token0,address indexed token1,uint24 fee,int24 tickSpacing,address pool)"
])

const topic = iface.getEvent("PoolCreated").topicHash

let lastBlock = 0

export async function getNewPools(){

 try{

  const latest = await provider.getBlockNumber()

  let fromBlock = lastBlock || Math.max(latest - 9, 0)

  if(latest - fromBlock > 9){
   fromBlock = latest - 9
  }

  const logs = await provider.getLogs({
   address: FACTORY,
   fromBlock,
   toBlock: latest,
   topics:[topic]
  })

  const pools=[]

  for(const log of logs){

   const parsed = iface.parseLog(log)

   pools.push({
    type:"uniswap_pool_created",
    token0:parsed.args.token0.toLowerCase(),
    token1:parsed.args.token1.toLowerCase(),
    fee:Number(parsed.args.fee),
    pool:parsed.args.pool.toLowerCase(),
    tx:log.transactionHash,
    observed_at:log.blockNumber
   })

  }

  lastBlock = latest

  return pools

 }

 catch(e){

  console.log("Uniswap scan error:",e.message)

  return []

 }

}