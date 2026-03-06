import { provider } from "./baseRpc.js"
import { ethers } from "ethers"

export async function scanBaseBlocks(){

 const signals=[]

 try{

  const block = await provider.getBlock("latest",true)

  block.transactions.forEach(tx=>{

   if(tx.value && tx.value > ethers.parseEther("20")){

    signals.push({
     type:"whale_tx",
     wallet:tx.from,
     amount:Number(ethers.formatEther(tx.value)),
     tx:tx.hash
    })

   }

  })

 }catch(err){

  console.error("RPC scan error:",err)

 }

 return signals

}