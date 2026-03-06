import { provider } from "./baseRpc.js"
import { ethers } from "ethers"

const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"

const ABI = [
 "event PoolCreated(address indexed token0,address indexed token1,uint24 fee,int24 tickSpacing,address pool)"
]

const contract = new ethers.Contract(
 FACTORY,
 ABI,
 provider
)

let lastBlock = null

export async function scanUniswapPools() {

  try {

    const latest = await provider.getBlockNumber()

    if(!lastBlock){
      lastBlock = latest - 20
    }

    const filter = contract.filters.PoolCreated()

    const events = await contract.queryFilter(
      filter,
      lastBlock,
      latest
    )

    const signals = []

    events.forEach(e => {

      if (!e.args) return

      signals.push({

        type: "uniswap_pool_created",

        token0: e.args.token0.toLowerCase(),
        token1: e.args.token1.toLowerCase(),
        pool: e.args.pool.toLowerCase()

      })

    })

    lastBlock = latest

    return signals

  }

  catch (err) {

    console.error("Uniswap scan error:", err.message)

    return []

  }

}