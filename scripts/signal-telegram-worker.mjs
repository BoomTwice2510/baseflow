// scripts/signal-telegram-worker.mjs
import "dotenv/config";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SIGNAL_URL =
  process.env.SIGNAL_AGENT_URL || "http://localhost:3000/api/signals";

const seenIds = new Set();

async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown"
    })
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Telegram error", res.status, body);
  }
}

function formatSignalMessage(signal) {
  const m = signal.meta || {};
  const type = signal.type;
  const desc = signal.description;
  const ts = signal.observed_at;

  let header = `⚡ *${type}*`;
  let extra = "";

  if (type === "whale_transfer" && m.eth_value) {
    extra = `\n💰 ${m.eth_value} ETH`;
  } else if (type === "token_deploy") {
    extra = `\n🪙 New token deploy by ${m.deployer?.slice(0, 8)}...`;
  } else if (type === "liquidity_migration" && m.eth_value) {
    extra = `\n💦 Liquidity move: ${m.eth_value} ETH`;
  } else if (type === "smart_money_wallet" && m.volume_eth) {
    extra = `\n🧠 Smart wallet vol: ${m.volume_eth} ETH`;
  }

  let txLine = "";
  if (m.tx_hash) {
    txLine = `\n🔗 [tx](https://basescan.org/tx/${m.tx_hash})`;
  }

  return `${header}\n${desc}${extra}${txLine}\n\n⏱ ${ts}`;
}

async function poll() {
  try {
    const res = await fetch(SIGNAL_URL);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Signal agent error", res.status, body);
      return;
    }

    const json = await res.json();
    const signals = json.signals || [];

    const interesting = signals.filter((s) =>
      [
        "whale_transfer",
        "token_deploy",
        "liquidity_migration",
        "dex_swap",
        "smart_money_wallet"
      ].includes(s.type)
    );

    for (const s of interesting) {
      if (seenIds.has(s.id)) continue;
      seenIds.add(s.id);

      const text = formatSignalMessage(s);
      await sendTelegram(text);
    }
  } catch (e) {
    console.error("poll error", e);
  }
}

async function main() {
  console.log("Starting signal telegram worker...");
  console.log("SIGNAL_URL:", SIGNAL_URL);
  await poll();
  setInterval(poll, 30000);
}

main().catch(console.error);
