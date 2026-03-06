import { provider } from "./baseRpc.js"
import { formatEther } from "ethers"

const WHALE_THRESHOLD = 50

export async function scanBaseBlocks(){

 const signals = []

 try{

  const block = await provider.getBlockWithTransactions("latest")

  for(const tx of block.transactions){

   const value = Number(formatEther(tx.value || 0))

   // 🐋 Whale transfer
   if(value >= WHALE_THRESHOLD){

    signals.push({
     type:"whale_tx",
     wallet:tx.from,
     amount:value,
     tx:tx.hash
    })

   }

   // 🪙 Contract deploy
   if(tx.to === null){

    signals.push({
     type:"token_deploy",
     creator:tx.from,
     tx:tx.hash
    })

   }

   // 🚀 Suspicious launch pattern
   if(tx.to === null && value > 1){

    signals.push({
     type:"launch_activity",
     creator:tx.from,
     amount:value,
     tx:tx.hash
    })

   }

  }

 }catch(err){

  console.error("RPC scan error:",err.message)

 }

 return signals

}