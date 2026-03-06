export function resolveToken(signal){

  const isAddress = (v) =>
    typeof v === "string" && v.startsWith("0x") && v.length === 42

  if(isAddress(signal.contract))
    return signal.contract.toLowerCase()

  if(isAddress(signal.token))
    return signal.token.toLowerCase()

  if(isAddress(signal.baseToken?.address))
    return signal.baseToken.address.toLowerCase()

  const blacklist = ["weth","usdc","base"]

  if(signal.token0 && !blacklist.includes(signal.token0.toLowerCase()))
    return signal.token0.toLowerCase()

  if(signal.token1 && !blacklist.includes(signal.token1.toLowerCase()))
    return signal.token1.toLowerCase()

  return null

}