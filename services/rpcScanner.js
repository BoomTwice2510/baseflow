import { ethers } from "ethers"

const provider = new ethers.JsonRpcProvider(
  "https://mainnet.base.org"
)

let lastBlock = null

export async function scanBaseBlocks() {

  const signals = []

  try {

    const currentBlock = await provider.getBlockNumber()

    if (!lastBlock) {
      lastBlock = currentBlock - 2
    }

    for (let i = lastBlock; i <= currentBlock; i++) {

      const block = await provider.getBlock(i, true)

      if (!block || !block.transactions) continue

      block.transactions.forEach(tx => {

        // contract deploy
        if (tx.to === null) {
          signals.push({
            type: "token_deploy",
            creator: tx.from,
            hash: tx.hash
          })
        }

        // whale transfer
        if (tx.value && tx.value > ethers.parseEther("20")) {
          signals.push({
            type: "whale_tx",
            wallet: tx.from,
            amount: ethers.formatEther(tx.value)
          })
        }

      })

    }

    lastBlock = currentBlock

  } catch (err) {

    console.error("RPC scan error:", err)

  }

  return signals
}