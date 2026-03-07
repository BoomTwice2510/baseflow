import { provider } from "./baseRpc.js"
import { formatEther } from "ethers"

const WHALE_THRESHOLD = 25

let lastBlock = 0

export async function scanBaseBlocks(){

 const signals=[]

 try{

  const current = await provider.getBlockNumber()

  for(let i = lastBlock + 1; i <= current; i++){

   const block = await provider.getBlock(i,true)

   for(const tx of block.transactions){

    const ethValue = tx.value ? Number(formatEther(tx.value)) : 0

    if(ethValue >= WHALE_THRESHOLD){

     signals.push({
      type:"whale_tx",
      wallet:tx.from,
      amount:ethValue,
      tx:tx.hash
     })

    }

   }

  }

  lastBlock = current

 }catch(err){

  console.error("RPC scan error:",err.message)

 }

 return signals
}