import { provider } from "./baseRpc.js"
import { formatEther } from "ethers"

const WHALE_THRESHOLD = 50

export async function scanBaseBlocks(){

 const signals = []

 try{

  const block = await provider.getBlockWithTransactions("latest");

for (const tx of block.transactions) {
  const observed_at = new Date(block.timestamp * 1000).toISOString();

  if (value >= WHALE_THRESHOLD) {
    signals.push({
      type: "whale_tx",
      wallet: tx.from,
      amount: value,
      tx: tx.hash,
      observed_at,
      source: "rpc_whale",
    });
  }

  if (tx.to === null) {
    signals.push({
      type: "token_deploy",
      creator: tx.from,
      tx: tx.hash,
      observed_at,
      source: "rpc_deploy",
    });
  }

  if (tx.to === null && value > 1) {
    signals.push({
      type: "launch_activity",
      creator: tx.from,
      amount: value,
      tx: tx.hash,
      observed_at,
      source: "rpc_launch",
    });
  }
}

 }catch(err){

  console.error("RPC scan error:",err.message)

 }

 return signals

}