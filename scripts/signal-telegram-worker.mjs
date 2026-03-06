import fetch from "node-fetch"
import fs from "fs"

const BOT = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID
const SIGNAL_URL = process.env.SIGNAL_AGENT_URL

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

function getId(s) {
  return s.tx || s.contract || `${s.wallet}-${s.amount}`
}

function formatSignal(s) {

  if (s.type === "whale_tx") {
    return `🐋 WHALE MOVE

💰 ${Number(s.amount).toFixed(2)} ETH
👛 ${s.wallet?.slice(0,10)}...

🔗 https://basescan.org/tx/${s.tx}

⚡ BaseFlow`
  }

  if (s.type === "token_deploy") {
    return `🪙 NEW TOKEN DEPLOYED

🏗 Creator
${s.creator?.slice(0,12)}...

📦 Contract
${s.contract?.slice(0,12)}...

🔎 https://basescan.org/address/${s.contract}

⚡ BaseFlow`
  }

  if (s.type === "volume_spike") {
    return `📈 VOLUME SPIKE

💰 $${Math.round(s.amount)}

⚡ BaseFlow`
  }

  return `⚡ ${s.type}`
}

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
    const data = await res.json()

    const signals = data.signals || []

    for(const s of signals){

 const id = getId(s)

 // duplicate skip
 if(sent.includes(id)) continue

 // score filter
 if((s.score || 0) < 5) continue

 const msg = formatSignal(s)

 await sendTelegram(msg)

 sent.push(id)

if(sent.length > 2000){
 sent = sent.slice(-2000)
}

}

    fs.writeFileSync(STORE_FILE,JSON.stringify(sent,null,2))

  }catch(err){
    console.error("worker error:",err)
  }

}

run()