import fetch from "node-fetch"
import fs from "fs"

const BOT = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID
const SIGNAL_URL = process.env.SIGNAL_AGENT_URL

const STORE_FILE = "./sent-signals.json"

let sent = []

if (fs.existsSync(STORE_FILE)) {
 sent = JSON.parse(fs.readFileSync(STORE_FILE))
}

function getId(s){

 return s.tx || s.contract || s.wallet + s.amount

}

function formatSignal(s){

 let msg = `⚡ ${s.type}\n`

 if(s.wallet) msg += `👛 ${s.wallet}\n`
 if(s.amount) msg += `💰 ${s.amount}\n`
 if(s.contract) msg += `🪙 ${s.contract}\n`
 if(s.tx) msg += `🔗 https://basescan.org/tx/${s.tx}\n`

 return msg

}

async function sendTelegram(text){

 const url = `https://api.telegram.org/bot${BOT}/sendMessage`

 await fetch(url,{
  method:"POST",
  headers:{ "Content-Type":"application/json"},
  body:JSON.stringify({
   chat_id:CHAT,
   text
  })
 })

}

async function run(){

 const res = await fetch(SIGNAL_URL)
 const data = await res.json()

 const signals = data.signals || []

 for(const s of signals){

  const id = getId(s)

  if(sent.includes(id)) continue

  const msg = formatSignal(s)

  await sendTelegram(msg)

  sent.push(id)

 }

 fs.writeFileSync(STORE_FILE,JSON.stringify(sent))

}

run()