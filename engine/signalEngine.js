export function buildSignals({ pairs = [], gas = 0, pools = [] }) {

  const signals = []

  // tokens blacklist
  const blacklist = ["BASE","WETH","USDC"]

  // duplicate tokens avoid
  const seenTokens = new Set()

  pairs.forEach(pair => {

    const token =
      (pair?.baseToken?.symbol || "UNKNOWN").toUpperCase()

    if (blacklist.includes(token)) return

    if (seenTokens.has(token)) return
    seenTokens.add(token)

    const liquidity = pair?.liquidity?.usd || 0
    const volume = pair?.volume?.h24 || 0

    // liquidity signal
    if (liquidity > 50000 && liquidity < 10000000) {

      signals.push({
        type: "liquidity_added",
        token,
        liquidity
      })

    }

    // volume spike
    if (volume > 200000) {

      signals.push({
        type: "volume_spike",
        token,
        volume
      })

    }

  })


  // gas spike
  if (gas > 1000000000) {

    signals.push({
      type: "gas_spike",
      gas
    })

  }


  // new pools
  pools.forEach(pool => {

    signals.push({
      type: "uniswap_pool_created",
      pool: pool?.pool || "unknown"
    })

  })


  return signals
}