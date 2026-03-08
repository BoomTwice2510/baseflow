// services/dune.js

const DUNE_API = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_API_KEY;

const MAX_CACHE = 5000;
const RETRIES = 3;

const seen = new Map();

// ================= DEDUPE =================

function isNew(id) {
  if (!id) return true;

  if (seen.has(id)) return false;

  seen.set(id, Date.now());

  if (seen.size > MAX_CACHE) {
    const first = seen.keys().next().value;
    seen.delete(first);
  }

  return true;
}

// ================= API HELPER =================

async function fetchWithRetry(url, retries = RETRIES) {
  try {
    const res = await fetch(url, {
      headers: {
        "x-dune-api-key": API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Dune API ${res.status}`);
    }

    return await res.json();

  } catch (err) {

    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, retries - 1);
    }

    console.error("Dune fetch failed:", err.message);
    return null;
  }
}

async function getLatestRows(queryId) {

  const url = `${DUNE_API}/query/${queryId}/results?limit=100`;

  const data = await fetchWithRetry(url);

  if (!data) return [];

  return data?.result?.rows || [];
}

// ================= SIGNAL HELPERS =================


// Whale transactions
export async function getWhaleSignals(){

 const rows = await getLatestRows(6783085)

 const seen = new Set()

 return rows
  .filter(r => !seen.has(r.hash) && seen.add(r.hash))
  .map(r => ({

   type:"whale_tx",
   wallet:r.from,
   to:r.to,
   amount:Number(r.eth_amount || 0),
   tx:r.hash,
   observed_at:r.block_time,
   source:"dune_whale"

  }))
}

// Volume spikes
export async function getVolumeSignals(){

 const rows = await getLatestRows(6783182)

 const seen = new Set()

 return rows
  .filter(r => r.token_bought_symbol !== "USDC")
  .filter(r => r.token_bought_symbol !== "USDT")
  .filter(r => r.token_bought_symbol !== "WETH")
  .filter(r => !seen.has(r.tx_hash) && seen.add(r.tx_hash))
  .map(r => ({

   type:"volume_spike",
   token:r.token_bought_symbol,
   volume:Number(r.cluster_volume || r.usd_value || 0),
   wallet:r.taker,
   tx:r.tx_hash,
   observed_at:r.block_time,
   source:"dune_volume"

  }))
}


// Smart money buys
export async function getSmartMoneySignals(){

 const rows = await getLatestRows(6791926)

 return rows
  .filter(r => r.token_bought_symbol !== "USDC")
  .map(r => ({

   type:"smart_money_buy",
   wallet:r.taker,
   token:r.token_bought_symbol,
   amount:Number(r.usd_value || 0),
   tx:r.tx_hash,
   observed_at:r.block_time,
   source:"dune_smart_money"

  }))
}


// Multi whale accumulation
export async function getMultiWhaleSignals() {

  const rows = await getLatestRows(6792053);

  return rows
    .filter(r => isNew(r.tx_hash))
    .map(r => ({
      type: "multi_whale",
      token: r.token_bought_address,
      whales: Number(r.whale_wallets || 0),
      volume: Number(r.cluster_volume || 0),
      tx: r.tx_hash,
      observed_at: r.block_time || r.timestamp,
      source: "dune_multi_whale"
    }));
}


// Holder spike
export async function getHolderSpikeSignals() {

  const rows = await getLatestRows(6792078);

  return rows
    .filter(r => Number(r.holders_1h || 0) > 150)
    .map(r => ({
      type:"holder_spike",
      token:r.contract_address,
      holders_1h:Number(r.holders_1h || 0),
      growth:Number(r.growth_percent || 0),
      observed_at:new Date().toISOString(),
      source:"dune_holder_spike"
    }));
}