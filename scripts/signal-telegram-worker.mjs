import fetch from "node-fetch"
import fs from "fs"

const BOT = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID
const SIGNAL_URL = process.env.SIGNAL_AGENT_URL

// env safety
if(!BOT || !CHAT || !SIGNAL_URL){
 console.error("Missing env variables")
 process.exit(1)
}

const STORE_FILE = "./sent-signals.json"

let sent = []

// load already sent signals
if (fs.existsSync(STORE_FILE)) {
  try {
    sent = JSON.parse(fs.readFileSync(STORE_FILE))
  } catch {
    sent = []
  }
}

// stronger unique id
function getId(s) {
  return (
    s.tx ||
    s.contract ||
    `${s.token}-${s.type}` ||
    `${s.wallet}-${s.amount}-${s.type}`
  )
}

// telegram formatting
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
    const body = await res.text()
    console.error("Telegram error:",body)
  }
}

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

      const id = getId(s)

      // duplicate skip
      if(sent.includes(id)) continue

      // score filter
      if((s.score || 0) < 5) continue

      const msg = formatSignal(s)

      batch.push(msg)

      sent.push(id)

      if(sent.length > 2000){
        sent = sent.slice(-2000)
      }

    }

    if(batch.length > 0){

      const finalMessage =
`⚡ BASEFLOW SIGNALS

${batch.join("\n\n")}

⚡ BaseFlow`

      await sendTelegram(finalMessage)

    }

    fs.writeFileSync(STORE_FILE,JSON.stringify(sent,null,2))

  }catch(err){
    console.error("worker error:",err)
  }

}

run()