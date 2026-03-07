import { provider } from "./baseRpc.js"
import { ethers } from "ethers"

const FACTORY="0x33128a8fC17869897dcE68Ed026d694621f6FDfD"

const ABI=[
 "event PoolCreated(address indexed token0,address indexed token1,uint24 fee,int24 tickSpacing,address pool)"
]

const contract=new ethers.Contract(FACTORY,ABI,provider)

let lastBlock=0

export async function scanUniswapPools(){

 try{

  const latest=await provider.getBlockNumber()

  if(!lastBlock){
   lastBlock = latest - 9
  }

  // free RPC safe range
  if(latest - lastBlock > 9){
   lastBlock = latest - 9
  }

  const events = await contract.queryFilter(
   contract.filters.PoolCreated(),
   lastBlock,
   latest
  )

  const signals=[]

  for(const e of events){

   signals.push({

    type:"uniswap_pool_created",

    token0:e.args.token0.toLowerCase(),

    token1:e.args.token1.toLowerCase(),

    pool:e.args.pool.toLowerCase(),

    fee:Number(e.args.fee),

    tx:e.transactionHash,

    observed_at:e.blockNumber

   })

  }

  lastBlock = latest

  return signals

 }

 catch(err){

  console.error("Uniswap scan error:",err.message)

  return []

 }

}