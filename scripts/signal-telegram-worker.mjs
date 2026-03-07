const BOT = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID
const SIGNAL_URL = process.env.SIGNAL_AGENT_URL

if (!BOT || !CHAT || !SIGNAL_URL) {
  console.error("Missing env variables")
  process.exit(1)
}

// format telegram message
function formatSignal(s) {

  if (s.type === "whale_tx") {
    return `🐋 WHALE MOVE
💰 ${Number(s.amount).toFixed(2)} ETH
👛 ${s.wallet?.slice(0,10)}...
🔗 https://basescan.org/tx/${s.tx}`
  }

  if (s.type === "token_deploy") {
    return `🪙 NEW TOKEN DEPLOYED
🏗 Creator ${s.creator?.slice(0,12)}...
📦 Contract ${s.contract?.slice(0,12)}...
🔎 https://basescan.org/address/${s.contract}`
  }

  if (s.type === "volume_spike") {
    return `📈 VOLUME SPIKE
💰 $${Math.round(s.amount)}`
  }

  if (s.type === "smart_money_buy") {
    return `🧠 SMART MONEY BUY
👛 ${s.wallet?.slice(0,12)}...
🪙 ${s.token}
💰 $${Math.round(s.amount)}
🔗 https://basescan.org/tx/${s.tx}`
  }

  if (s.type === "multi_whale") {
    return `🐳 MULTI WHALE
🪙 ${s.token}
🐋 Whales ${s.whales}
💰 $${Math.round(s.volume)}`
  }

  if (s.type === "holder_spike") {
    return `📈 HOLDER SPIKE
🪙 ${s.token}
👥 Growth ${s.growth}%`
  }

  return `⚡ ${s.type}`
}

// telegram sender
async function sendTelegram(text) {

  const url = `https://api.telegram.org/bot${BOT}/sendMessage`

  const res = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      chat_id:CHAT,
      text
    })
  })

  if(!res.ok){
    console.error("Telegram error:", await res.text())
  }
}


// 🔥 HIGH CONVICTION DETECTOR
function detectHighConviction(signals){

  const tokenMap = {}

  for(const s of signals){

    const token =
      s.token ||
      s.contract ||
      null

    if(!token) continue

    if(!tokenMap[token]){
      tokenMap[token] = []
    }

    tokenMap[token].push(s)

  }

  const alerts = []

  for(const token in tokenMap){

    const group = tokenMap[token]

    const types = new Set(group.map(s=>s.type))

    if(
      types.has("smart_money_buy") &&
      types.has("whale_tx")
    ){

      alerts.push({
        token,
        signals: group
      })

    }

  }

  return alerts
}



// worker main
async function run(){

  try{

    const res = await fetch(SIGNAL_URL)

    if(!res.ok){
      console.error("Signal API error:",res.status)
      return
    }

    const data = await res.json()

    const signals = data.signals || []

    const batch = []

    for(const s of signals){

      if((s.score || 0) < 5) continue

      batch.push(formatSignal(s))

    }

    // 🔥 HIGH CONVICTION ALERTS
    const alerts = detectHighConviction(signals)

    for(const a of alerts){

      const msg =
`🔥 HIGH CONVICTION SIGNAL

Token: ${a.token}

Signals:
${a.signals.map(s=>"• "+s.type).join("\n")}

⚡ BaseFlow`

      await sendTelegram(msg)

    }

    if(batch.length === 0){
      console.log("No signals to send")
      return
    }

    const finalMessage =
`⚡ BASEFLOW SIGNALS

${batch.join("\n\n")}

⚡ BaseFlow`

    await sendTelegram(finalMessage)

  }
  catch(err){
    console.error("Worker error:",err)
  }

}

run()