// scripts/signal-telegram-worker.mjs (ya .js with "type": "module")

import dotenv from "dotenv";
dotenv.config();

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const SIGNAL_URL = process.env.SIGNAL_AGENT_URL;

console.log("DEBUG ENVS:", {
  TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  SIGNAL_AGENT_URL: process.env.SIGNAL_AGENT_URL,
});

if (!BOT || !CHAT || !SIGNAL_URL) {
  console.error("Missing env variables");
  process.exit(1);
}

const sentSignals = new Map();
const MAX_MEMORY = 3000;

// ========== DEDUPE ==========

function isNewSignal(s) {
  const id =
    s.tx_hash ||
    s.tx ||
    s.contract ||
    s.token ||
    `${s.type}-${s.observed_at}`;

  if (!id) return true;

  if (sentSignals.has(id)) return false;

  sentSignals.set(id, Date.now());

  if (sentSignals.size > MAX_MEMORY) {
    const first = sentSignals.keys().next().value;
    sentSignals.delete(first);
  }

  return true;
}

// ========== FORMATTERS ==========

function formatSignal(s) {
  // WHALE TX
  if (s.type === "whale_tx") {
    const eth =
      Number(s.amount_eth || s.meta?.eth_amount || s.amount || 0);
    const from = s.wallet_from || s.wallet;
    const tx = s.tx_hash || s.tx;

    return `🐋 WHALE MOVE

💰 ${eth.toFixed(2)} ETH
👛 ${(from || "").slice(0, 10)}...
🔗 <a href="https://basescan.org/tx/${tx}">View on BaseScan</a>`;
  }

  // DUNE VOLUME SPIKE
  if (s.type === "volume_spike") {
    const vol =
      Number(s.cluster_volume || 0) ||
      Number(s.meta?.cluster_volume || 0) ||
      Number(s.usd_value || 0);

    return `📈 VOLUME SPIKE

💰 $${Math.round(vol).toLocaleString()}
🪙 ${s.symbol || s.token || ""}`;
  }

  // SMART MONEY BUY
  if (s.type === "smart_money_buy") {
    const amt = Number(
      s.usd_value || s.amount || s.meta?.usd_value || 0
    );
    const tx = s.tx_hash || s.tx;

    return `🧠 SMART MONEY BUY

👛 ${(s.wallet || "").slice(0, 12)}...
🪙 ${s.symbol || s.token || ""}
💰 $${Math.round(amt).toLocaleString()}
🔗 <a href="https://basescan.org/tx/${tx}">View on BaseScan</a>`;
  }

  // MULTI WHALE
  if (s.type === "multi_whale") {
    const vol =
      Number(s.cluster_volume || 0) ||
      Number(s.meta?.cluster_volume || 0);
    const whales = Number(s.whales || s.meta?.whale_wallets || 0);

    return `🐳 MULTI WHALE

🪙 ${s.symbol || s.token || ""}
🐋 Whales: ${whales}
💰 $${Math.round(vol).toLocaleString()}`;
  }

  // HOLDER SPIKE
  if (s.type === "holder_spike") {
    const token = s.token;
    const growth = Number(
      s.growth_percent || s.growth || s.meta?.growth_percent || 0
    ).toFixed(2);
    const holders =
      s.holders_1h || s.meta?.holders_1h || 0;

    const short = token
      ? `${token.slice(0, 6)}...${token.slice(-4)}`
      : "unknown";

    return `📈 HOLDER SPIKE

🪙 Token: <code>${short}</code>
👥 Holders (1h): ${holders}
📊 Growth: ${growth}%

🔗 <a href="https://basescan.org/token/${token}">View on BaseScan</a>`;
  }

  return `⚡ ${s.type}`;
}

// ========== TELEGRAM SENDER ==========

async function sendTelegram(text, retry = 2) {
  const url = `https://api.telegram.org/bot${BOT}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();

      if (res.status === 429 && retry > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return sendTelegram(text, retry - 1);
      }

      console.error("Telegram error:", err);
    }
  } catch (err) {
    console.error("Telegram send failed:", err);
  }
}

// ========== HIGH CONVICTION ==========

function detectHighConviction(signals) {
  const tokenMap = {};

  for (const s of signals) {
    const token = s.token || s.contract;
    if (!token) continue;
    if (!tokenMap[token]) tokenMap[token] = [];
    tokenMap[token].push(s);
  }

  const alerts = [];

  for (const token in tokenMap) {
    const group = tokenMap[token];
    const types = new Set(group.map((s) => s.type));

    if (
      (types.has("smart_money_buy") && types.has("volume_spike")) ||
      (types.has("multi_whale") && types.has("volume_spike")) ||
      (types.has("smart_money_buy") && types.has("whale_tx"))
    ) {
      alerts.push({ token, signals: group });
    }
  }

  return alerts;
}

// ========== SPLIT LONG MSGS ==========

function splitMessages(text) {
  const limit = 3500;

  if (text.length < limit) return [text];

  const parts = [];
  let chunk = "";

  for (const line of text.split("\n")) {
    if ((chunk + line).length > limit) {
      parts.push(chunk);
      chunk = "";
    }
    chunk += line + "\n";
  }

  if (chunk) parts.push(chunk);

  return parts;
}

// ========== WORKER MAIN ==========

async function run() {
  try {
    const url = `${SIGNAL_URL.replace(/\/$/, "")}/api/signals?nocache=${Date.now()}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error("Signal API error:", res.status);
      return;
    }

    const data = await res.json();
    const signals = data.signals || [];

    // top 3 holder_spike + baaki sab
    const holderSpikes = signals
      .filter((s) => s.type === "holder_spike")
      .sort(
        (a, b) =>
          (b.growth_percent || b.growth || 0) -
          (a.growth_percent || a.growth || 0)
      )
      .slice(0, 3);

    const otherSignals = signals.filter(
      (s) => s.type !== "holder_spike"
    );

    const finalSignals = [...holderSpikes, ...otherSignals];

    const batch = [];

    for (const s of finalSignals) {
      if (!isNewSignal(s)) continue;
      if ((s.score || 0) < 4) continue; // low-score noise cut
      batch.push(formatSignal(s));
    }

    // high conviction combos (optional extra pings)
    const alerts = detectHighConviction(signals);

    for (const a of alerts) {
      const msg = `🔥 HIGH CONVICTION SIGNAL

Token: ${a.token}

Signals:
${a.signals.map((s) => "• " + s.type).join("\n")}

⚡ BaseFlow`;
      await sendTelegram(msg);
    }

    if (batch.length === 0) {
      console.log("No signals above threshold");
      return;
    }

    const finalMessage = `⚡ BASEFLOW SIGNALS – BASE

${batch.join("\n\n────────────────────\n\n")}

⚡ BaseFlow`;

    const parts = splitMessages(finalMessage);

    for (const p of parts) {
      await sendTelegram(p);
    }
  } catch (err) {
    console.error("Worker error:", err);
  }
}

run();
