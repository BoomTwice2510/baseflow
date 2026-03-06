import fetch from "node-fetch"
import dotenv from "dotenv"

dotenv.config()

const BOT = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_CHAT_ID
const API = process.env.SIGNAL_API

let lastHash = new Set()

function formatSignal(s){

 if(s.type === "whale_tx"){
  return `🐋 Whale Tx

Wallet: ${s.wallet}
Amount: ${s.amount} ETH
Tx: https://basescan.org/tx/${s.tx}`
 }

 if(s.type === "token_deploy"){
  return `🚀 Token Deploy

Creator: ${s.creator}
Contract: https://basescan.org/address/${s.contract}`
 }

 if(s.type === "volume_spike"){
  return `📈 Volume Spike

Volume: $${Math.round(s.amount)}`
 }

 if(s.type === "liquidity_added"){
  return `💧 Liquidity Added

Token: ${s.token}
Liquidity: $${Math.round(s.liquidity)}`
 }

 if(s.type === "uniswap_pool_created"){
  return `🦄 New Pool

Pool: ${s.pool}`
 }

 return null
}

async function sendTelegram(text){

 await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
  method:"POST",
  headers:{ "Content-Type":"application/json" },
  body: JSON.stringify({
   chat_id: CHAT,
   text,
   disable_web_page_preview:true
  })
 })

}

async function loop(){

 try{

  const res = await fetch(API)

  const data = await res.json()

  const signals = data.signals || []

  for(const s of signals){

   const key = JSON.stringify(s)

   if(lastHash.has(key)) continue

   const msg = formatSignal(s)

   if(msg){

    await sendTelegram(msg)

    lastHash.add(key)

   }

  }

 }catch(err){

  console.log("worker error",err.message)

 }

}

setInterval(loop,20000)

console.log("telegram worker started")