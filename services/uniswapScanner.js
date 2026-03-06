import { ethers } from "ethers"

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_RPC_URL || "https://base.llamarpc.com"
)

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

    const fromBlock = latest - 20

    const filter = contract.filters.PoolCreated()

    const events = await contract.queryFilter(
      filter,
      fromBlock,
      latest
    )

    const signals = []

    events.forEach(e => {

      if (!e.args) return

      signals.push({

        type: "uniswap_pool_created",

        token0: e.args.token0,

        token1: e.args.token1,

        pool: e.args.pool

      })

    })

    return signals

  }

  catch (err) {

    console.error("Uniswap scan error:", err.message)

    return []

  }

}