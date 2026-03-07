import { resolveToken } from "./tokenResolver.js"

export function applySignalCorrelation(signals){

 const tokenMap={}

 for(const s of signals){

  const key = resolveToken(s)

  if(!key) continue

  if(!tokenMap[key]) tokenMap[key]=[]

  tokenMap[key].push(s)

 }

 const now = Date.now()

 for(const token in tokenMap){

  const group = tokenMap[token]

  const recent = group.filter(
   s => s.observed_at &&
   now - new Date(s.observed_at).getTime() < 15 * 60 * 1000
  )

  const types = new Set(recent.map(s=>s.type))

  let bonus=0

  if(types.has("smart_money_buy") && types.has("volume_spike")){
   bonus += 5
  }

  if(types.has("multi_whale") && types.has("volume_spike")){
   bonus += 4
  }

  if(recent.filter(s=>s.type==="holder_spike").length >=2){
   bonus += 2
  }

  if(bonus>0){

   recent.forEach(s=>{
    s.score = (s.score||0)+bonus
   })

  }

 }

 return signals

}