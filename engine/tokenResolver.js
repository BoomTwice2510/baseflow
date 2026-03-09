import { isAddress } from "ethers"

const BASE_TOKENS = new Set([
 "0x4200000000000000000000000000000000000006", // WETH
 "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", // USDbC
 "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913".toLowerCase(), // USDC
])

export function resolveToken(signal){

 const getAddr = (v) =>
  typeof v === "string" && isAddress(v) ? v.toLowerCase() : null

 const candidates = [
  getAddr(signal.contract),
  getAddr(signal.token),
  getAddr(signal.contract_address),
  getAddr(signal.token_address),
  getAddr(signal.baseToken?.address),
  getAddr(signal.token_bought_address)
 ]

 for(const c of candidates){
  if(c && !BASE_TOKENS.has(c)){
   return c
  }
 }

 const t0 = getAddr(signal.token0)
 const t1 = getAddr(signal.token1)

 if(t0 && !BASE_TOKENS.has(t0)) return t0
 if(t1 && !BASE_TOKENS.has(t1)) return t1

 return null
}