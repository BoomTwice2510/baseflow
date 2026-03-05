// scripts/test-telegram.mjs
import fetch from "node-fetch";
import 'dotenv/config';


const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log("BOT", process.env.TELEGRAM_BOT_TOKEN, "CHAT", process.env.TELEGRAM_CHAT_ID);

async function main() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    process.exit(1);
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: "BaseFlow test message ✅",
    }),
  });

  const json = await res.json();
  console.log(res.status, json);
}

main().catch(console.error);
