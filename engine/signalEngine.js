export function buildSignals({ pairs = [], gas = {}, pools = [] }) {

  const signals = []

  const blacklist = ["BASE","WETH","USDC"]

  const seenTokens = new Set()

  const gasPrice = gas?.gas || 0

  pairs.forEach(pair => {

    const base = pair?.baseToken?.symbol?.toUpperCase()
    const baseAddress = pair?.baseToken?.address
    const quote = pair?.quoteToken?.symbol?.toUpperCase()

    if (!base || !baseAddress) return

    if (blacklist.includes(base) || blacklist.includes(quote)) return

    if (seenTokens.has(baseAddress)) return
    seenTokens.add(baseAddress)

    const liquidity = pair?.liquidity?.usd || 0
    const volume = pair?.volume?.h24 || 0

    if (liquidity > 200000 && liquidity < 2000000) {

      signals.push({
        type: "liquidity_added",
        token: baseAddress,
        liquidity
      })

    }

    if (volume > 200000) {

      signals.push({
        type: "volume_spike",
        token: baseAddress,
        volume
      })

    }

  })

  if (gasPrice > 5e9) {

    signals.push({
      type: "gas_spike",
      gas: gasPrice
    })

  }

  pools.forEach(pool => {

    signals.push({
      type: "uniswap_pool_created",
      token0: pool.token0,
      token1: pool.token1,
      pool: pool.pool
    })

  })

  return signals
}