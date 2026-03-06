export function buildSignals({ pairs = [], gas = {}, pools = [] }) {

  const signals = []

  const blacklist = ["BASE","WETH","USDC"]

  const seenTokens = new Set()

  const gasPrice = gas?.gas || 0


  pairs.forEach(pair => {

    const base = pair?.baseToken?.symbol?.toUpperCase()
    const quote = pair?.quoteToken?.symbol?.toUpperCase()

    if (!base) return

    if (blacklist.includes(base) || blacklist.includes(quote)) return

    if (seenTokens.has(base)) return
    seenTokens.add(base)

    const liquidity = pair?.liquidity?.usd || 0
    const volume = pair?.volume?.h24 || 0

    if (liquidity > 50000 && liquidity < 10000000) {

      signals.push({
        type: "liquidity_added",
        token: base,
        liquidity
      })

    }

    if (volume > 200000) {

      signals.push({
        type: "volume_spike",
        token: base,
        volume
      })

    }

  })


  if (gasPrice > 1000000000) {

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