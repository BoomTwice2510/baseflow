import 'dotenv/config';

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const SIGNAL_URL = process.env.SIGNAL_AGENT_URL;

if (!BOT || !CHAT || !SIGNAL_URL) {
  console.error("Missing env variables");
  process.exit(1);
}

const sentSignals = new Map();
const MAX_MEMORY = 3000;

// dedupe protection
function isNewSignal(s) {
  const id =
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

// format telegram message
function formatSignal(s) {
  if (s.type === "whale_tx") {
    const amt = Number(s.amount || 0);

    return `🐋 WHALE MOVE

💰 ${amt.toFixed(2)} ETH
👛 ${(s.wallet || "").slice(0, 10)}...
🔗 <a href="https://basescan.org/tx/${s.tx}">View on BaseScan</a>`;
  }

  if (s.type === "volume_spike") {
    const vol = Number(s.volume ?? s.amount ?? 0);

    return `📈 VOLUME SPIKE

💰 $${Math.round(vol).toLocaleString()}
🪙 ${s.token || ""}`;
  }

  if (s.type === "smart_money_buy") {
    const amt = Number(s.amount || 0);

    return `🧠 SMART MONEY BUY

👛 ${(s.wallet || "").slice(0, 12)}...
🪙 ${s.token}
💰 $${Math.round(amt).toLocaleString()}
🔗 <a href="https://basescan.org/tx/${s.tx}">View on BaseScan</a>`;
  }

  if (s.type === "multi_whale") {
    const vol = Number(s.volume || 0);

    return `🐳 MULTI WHALE

🪙 ${s.token}
🐋 Whales ${s.whales}
💰 $${Math.round(vol).toLocaleString()}`;
  }

  if (s.type === "holder_spike") {
    const token = s.token;
    const growth = Number(s.growth || 0).toFixed(2);
    const holders = s.holders_1h || 0;

    return `📈 HOLDER SPIKE

🪙 Token: <code>${token.slice(0, 6)}...${token.slice(-4)}</code>
👥 Holders (1h): ${holders}
📊 Growth: ${growth}%

🔗 <a href="https://basescan.org/token/${token}">View on BaseScan</a>`;
  }

  return `⚡ ${s.type}`;
}

// telegram sender with retry
async function sendTelegram(text, retry = 2) {
  const url = `https://api.telegram.org/bot${BOT}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT,
        text,
        parse_mode: "HTML"
      })
    });

    if (!res.ok) {
      const err = await res.text();

      if (res.status === 429 && retry > 0) {
        await new Promise(r => setTimeout(r, 2000));
        return sendTelegram(text, retry - 1);
      }

      console.error("Telegram error:", err);
    }
  } catch (err) {
    console.error("Telegram send failed:", err);
  }
}

// high conviction detection
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
    const types = new Set(group.map(s => s.type));

    if (
      (types.has("smart_money_buy") && types.has("volume_spike")) ||
      (types.has("multi_whale") && types.has("volume_spike")) ||
      (types.has("smart_money_buy") && types.has("whale_tx"))
    ) {
      alerts.push({
        token,
        signals: group
      });
    }
  }

  return alerts;
}

// split large messages
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

// worker
async function run() {
  try {
    const res = await fetch(`${SIGNAL_URL}/api/signals?nocache=${Date.now()}`);

    if (!res.ok) {
      console.error("Signal API error:", res.status);
      return;
    }

    const data = await res.json();

    const signals = data.signals || [];

    const batch = [];

    for (const s of signals) {
      if (!isNewSignal(s)) continue;

      if ((s.score || 0) < 4) continue;

      batch.push(formatSignal(s));
    }

    // high conviction alerts
    const alerts = detectHighConviction(signals);

    for (const a of alerts) {
      const msg = `🔥 HIGH CONVICTION SIGNAL

Token: ${a.token}

Signals:
${a.signals.map(s => "• " + s.type).join("\n")}

⚡ BaseFlow`;

      await sendTelegram(msg);
    }

    if (batch.length === 0) {
      console.log("No signals");
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
