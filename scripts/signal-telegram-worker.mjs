// scripts/signal-telegram-worker.mjs (ya .js with "type": "module")

import dotenv from "dotenv";
dotenv.config();

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const SIGNAL_AGENT_URL = process.env.SIGNAL_AGENT_URL;

console.log("DEBUG ENVS:", {
  TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  SIGNAL_AGENT_URL: process.env.SIGNAL_AGENT_URL,
});

if (!BOT || !CHAT || !SIGNAL_AGENT_URL) {
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

function short(addr = "", n = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`;
}

function formatSignal(s) {
  // WHALE TX
  if (s.type === "whale_tx") {
    const eth =
      Number(s.amount_eth || s.meta?.eth_amount || s.amount || 0);
    const from = s.wallet_from || s.wallet;
    const tx = s.tx_hash || s.tx;

    return `🐋 <b>WHALE MOVE</b>\n` +
      `💰 <b>${eth.toFixed(2)} ETH</b>\n` +
      `👛 <code>${short(from, 6)}</code>\n` +
      (tx
        ? ` 🟦 <a href="https://basescan.org/tx/${tx}">BaseScan</a>`
        : "");
  }

  // DUNE VOLUME SPIKE
  if (s.type === "volume_spike") {
    const vol =
      Number(s.cluster_volume || 0) ||
      Number(s.meta?.cluster_volume || 0) ||
      Number(s.usd_value || 0);

    const tx = s.tx_hash || s.tx;
    const token = s.token;
    const symbol = s.symbol || "";

    const tokenLabel =
      symbol || (token ? short(token, 4) : "unknown");

    const lines = [
      `📈 <b>VOLUME SPIKE</b>`,
      `💰 <b>$${Math.round(vol).toLocaleString()}</b>`,
      `🪙 ${tokenLabel}`,
    ];

    if (tx || token) {
      const parts = [];
      if (tx)
        parts.push(
          `<a href="https://basescan.org/tx/${tx}">tx</a>`
        );
      if (token)
        parts.push(
          `<a href="https://basescan.org/token/${token}?chain=base">token</a>`
        );
      lines.push(` 🟦 ${parts.join(" · ")}`);
    }

    return lines.join("\n");
  }

  // SMART MONEY BUY
  if (s.type === "smart_money_buy") {
    const amt = Number(
      s.usd_value || s.amount || s.meta?.usd_value || 0
    );
    const tx = s.tx_hash || s.tx;
    const symbol = s.symbol || "";
    const wallet = s.wallet;

    return (
      `🧠 <b>SMART BUY</b>\n` +
      `💰 <b>$${Math.round(amt).toLocaleString()}</b> ${symbol}\n` +
      (wallet ? `👛 <code>${short(wallet, 6)}</code>\n` : "") +
      (tx
        ? ` 🟦 <a href="https://basescan.org/tx/${tx}">BaseScan</a>`
        : "")
    );
  }

  // MULTI WHALE
  if (s.type === "multi_whale") {
    const vol =
      Number(s.cluster_volume || 0) ||
      Number(s.meta?.cluster_volume || 0);
    const whales = Number(s.whales || s.meta?.whale_wallets || 0);
    const symbol = s.symbol || "";
    const token = s.token;

    const lines = [
      `🐳 <b>MULTI WHALE</b>`,
      `🐋 ${whales} wallets · 💰 $${Math.round(
        vol
      ).toLocaleString()}`,
      `🪙 ${symbol || (token ? short(token, 4) : "unknown")}`,
    ];

    if (token) {
      lines.push(
        ` 🟦 <a href="https://basescan.org/token/${token}?chain=base">token</a>`
      );
    }

    return lines.join("\n");
  }

  // HOLDER SPIKE
  if (s.type === "holder_spike") {
    const token = s.token;
    const growth = Number(
      s.growth_percent || s.growth || s.meta?.growth_percent || 0
    ).toFixed(2);
    const holders = s.holders_1h || s.meta?.holders_1h || 0;

    const shortTok = token ? short(token, 4) : "unknown";

    return (
      `📈 <b>HOLDER SPIKE</b>\n` +
      `👥 <b>${holders}</b> in 1h · 📊 ${growth}%\n` +
      `🪙 <code>${shortTok}</code>\n` +
      (token
        ? ` 🟦 <a href="https://basescan.org/token/${token}?chain=base">BaseScan</a>`
        : "")
    );
  }

  return ` 🟦 ${s.type}`;
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
    const url = `${SIGNAL_AGENT_URL.replace(/\/$/, "")}/api/signals?nocache=${Date.now()}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error("Signal API error:", res.status);
      return;
    }

    const data = await res.json();

    // snapshot groups -> flat array
    const groups = data.groups || {};
    const flatSignals = [
      ...(groups.whales || []),
      ...(groups.holders || []),
      ...(groups.volume || []),
      ...(groups.smart || []),
      ...(groups.multi || []),
    ];

    console.log("snapshot signals length:", flatSignals.length);

    const batch = [];

    for (const s of flatSignals) {
      if (!isNewSignal(s)) continue;
      // TEST: scoring off – sab bhej de
      if ((s.score || 0) < 4) continue;
      batch.push(formatSignal(s));
    }

    if (batch.length === 0) {
      console.log("No snapshot signals for telegram");
      return;
    }

    const finalMessage = `🟦 BaseFlow SIGNALS

${batch.join("\n\n────────────────────\n\n")}

 🟦 BaseFlow`;

    const parts = splitMessages(finalMessage);

    for (const p of parts) {
      await sendTelegram(p);
    }
  } catch (err) {
    console.error("Worker error:", err);
  }
}

run();
