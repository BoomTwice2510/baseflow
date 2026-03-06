import { resolveToken } from "./tokenResolver.js"

export function applySignalCorrelation(signals){

  const tokenMap = {}

  for(const s of signals){

    const key = resolveToken(s)

    if(!key) continue

    if(!tokenMap[key]){
      tokenMap[key] = []
    }

    tokenMap[key].push(s)

  }

  for(const token in tokenMap){

    const group = tokenMap[token]

    const types = new Set(group.map(s => s.type))

    let bonus = 0

    if(types.has("whale_tx") && types.has("volume_spike")){
      bonus += 3
    }

    if(types.has("smart_money_buy") && types.has("multi_whale")){
      bonus += 4
    }

    if(group.filter(s => s.type === "holder_spike").length >= 2){
      bonus += 2
    }

    if(bonus > 0){
      group.forEach(s => {
        s.score = (s.score || 0) + bonus
      })
    }

  }

  return signals
}