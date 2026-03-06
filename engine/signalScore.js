export function scoreSignal(s){

 let score = 0

 if(s.type === "token_deploy") score += 3

 if(s.type === "whale_tx"){
  const amt = Number(s.amount || 0)

  if(amt > 10) score += 4
  if(amt > 50) score += 7
 }

 if(s.type === "volume_spike"){
  if(s.amount > 50000) score += 4
 }

 if(s.type === "liquidity_added"){
  if(s.liquidity > 100000) score += 6
 }

 return score
}