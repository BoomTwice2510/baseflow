import { ethers } from "ethers"
import { provider } from "./baseRpc.js"

let lastBlock = null

export async function scanBaseBlocks() {

  const signals = []

  try {

    const currentBlock = await provider.getBlockNumber()

    if (!lastBlock) {
      lastBlock = currentBlock - 3
    }

    for (let i = lastBlock; i <= currentBlock; i++) {

      const block = await provider.getBlock(i, true)

      if (!block) continue

      block.transactions.forEach(tx => {

        if (tx.to === null) {
          signals.push({
            type: "token_deploy",
            creator: tx.from,
            contract: tx.hash
          })
        }

        if (tx.value && tx.value > ethers.parseEther("3")) {
          signals.push({
            type: "whale_tx",
            wallet: tx.from,
            amount: Number(ethers.formatEther(tx.value))
          })
        }

      })

    }

    lastBlock = currentBlock

  } catch (err) {

    console.log("RPC scan error:", err.message)

  }

  return signals
}