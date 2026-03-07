export function scoreSignal(s){

 let score = 0

 const now = Date.now()

 if(s.observed_at){
  const age = now - new Date(s.observed_at).getTime()

  if(age < 5 * 60 * 1000) score += 2
  else if(age < 15 * 60 * 1000) score += 1
 }

 if(s.type === "whale_tx"){

 const amt = Number(s.amount || 0)

 if(amt > 100) score += 6
 else if(amt > 60) score += 5
 else if(amt > 30) score += 4
 else if(amt > 15) score += 3

}

 if(s.type === "volume_spike"){
  const vol = Number(s.volume || 0)

  if(vol > 200000) score += 5
  else if(vol > 100000) score += 4
 }

 if(s.type === "liquidity_added"){
  const liq = Number(s.liquidity || 0)

  if(liq > 300000) score += 6
  else if(liq > 150000) score += 4
 }

 if(s.type === "smart_money_buy"){
  const amt = Number(s.amount || 0)

  if(amt > 50000) score += 6
  else if(amt > 20000) score += 5
  else if(amt > 5000) score += 3
 }

 if(s.type === "multi_whale"){
  const whales = Number(s.whales || 0)

  if(whales >= 5) score += 7
  else if(whales >= 3) score += 5
 }

 if(s.type === "holder_spike"){
  const holders = Number(s.holders_1h || 0)

 if(holders > 300) score += 5
 else if(holders > 150) score += 3
 }

 return score

}