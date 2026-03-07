export function buildSignals({ pairs = [], gas = {}, pools = [] }) {

 const signals = []

 const BASE_TOKENS = new Set([
  "0x4200000000000000000000000000000000000006", // WETH
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
 ])

 const seenTokens = new Set()

 const gasPrice = gas?.gas || 0

 const now = new Date().toISOString()

 pairs.forEach(pair => {

  const baseAddr = pair?.baseToken?.address?.toLowerCase()
  const quoteAddr = pair?.quoteToken?.address?.toLowerCase()

  if(!baseAddr || !quoteAddr) return

  if(BASE_TOKENS.has(baseAddr) && BASE_TOKENS.has(quoteAddr)) return

  if(seenTokens.has(baseAddr)) return
  seenTokens.add(baseAddr)

  const liquidity = pair?.liquidity?.usd || 0
  const volume = pair?.volume?.h24 || 0

  if(liquidity > 200000){

   signals.push({
    type:"liquidity_added",
    token:baseAddr,
    liquidity,
    observed_at:now
   })

  }

  if(volume > 200000){

   signals.push({
    type:"volume_spike",
    token:baseAddr,
    volume,
    observed_at:now
   })

  }

 })

 if(gasPrice > 1e9){

  signals.push({
   type:"gas_spike",
   gas:gasPrice,
   observed_at:now
  })

 }

 pools.forEach(pool => {

  signals.push({
   type:"uniswap_pool_created",
   token0:pool.token0,
   token1:pool.token1,
   pool:pool.pool,
   observed_at:now
  })

 })

 return signals

}