export function scoreSignal(s){

 let score = 0

 if(s.type === "token_deploy") score += 3

 if(s.type === "whale_tx"){
  const amt = Number(s.amount || 0)

  if(amt > 50) score += 7
  else if(amt > 10) score += 4
 }

 if(s.type === "volume_spike"){
  if(Number(s.amount || 0) > 100000) score += 4
 }

 if(s.type === "liquidity_added"){
  if(Number(s.liquidity || 0) > 200000) score += 6
 }

 if(s.type === "smart_money_buy"){
  if(Number(s.amount || 0) > 20000) score += 5
 }

 if(s.type === "multi_whale"){
  if(Number(s.whales || 0) >= 3) score += 6
 }

 if(s.type === "holder_spike"){
  if(Number(s.holders_1h || 0) > 50) score += 2
 }

 return score
}