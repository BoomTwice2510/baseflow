const DUNE_API = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_API_KEY;

const POLL_INTERVAL = 2000;
const MAX_POLLS = 25;

// =====================
// BASIC FETCH
// =====================

async function duneFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "x-dune-api-key": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Dune error:", res.status, text);
    return null;
  }

  return res.json();
}

// =====================
// EXECUTE QUERY
// =====================

async function getLatestRows(queryId) {

  // 1️⃣ execute query
  const exec = await duneFetch(
    `${DUNE_API}/query/${queryId}/execute`,
    { method: "POST" }
  );

  if (!exec || !exec.execution_id) {
    console.error("No execution id from dune");
    return [];
  }

  const executionId = exec.execution_id;

  // 2️⃣ wait for completion
  let state = "QUERY_STATE_PENDING";
  let polls = 0;

  while (polls < MAX_POLLS) {

    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const status = await duneFetch(
      `${DUNE_API}/execution/${executionId}/status`
    );

    if (!status) return [];

    state = status.state;

    if (state === "QUERY_STATE_COMPLETED") {
      break;
    }

    if (
      state === "QUERY_STATE_FAILED" ||
      state === "QUERY_STATE_CANCELLED"
    ) {
      console.error("Dune query failed");
      return [];
    }

    polls++;
  }

  // 3️⃣ fetch results
  const result = await duneFetch(
    `${DUNE_API}/execution/${executionId}/results`
  );

  if (!result?.result?.rows) {
    console.log("No rows returned");
    return [];
  }

  return result.result.rows;
}

// =====================
// QUERIES
// =====================

const WHALE_QUERY_ID = 6783085;
const HOLDER_QUERY_ID = 6792078;
const VOLUME_QUERY_ID = 6783182;
const SMART_QUERY_ID = 6791926;
const MULTI_QUERY_ID = 6792053;

// =====================
// WHALES
// =====================

export async function getWhaleSignals() {

  const rows = await getLatestRows(WHALE_QUERY_ID);

  return rows.map(r => ({
    type: "whale_tx",
    token: null,
    symbol: "ETH",
    tx_hash: r.hash,
    wallet_from: r.from,
    wallet_to: r.to,
    amount_eth: Number(r.eth_amount || 0),
    usd_value: Number(r.usd_value || 0),
    observed_at: r.block_time,
    source: "dune_whale",
    meta: {
      eth_amount: Number(r.eth_amount || 0),
      usd_value: Number(r.usd_value || 0),
    },
    score: 0
  }));

}

// =====================
// HOLDER SPIKES
// =====================

export async function getHolderSignals() {

  const rows = await getLatestRows(HOLDER_QUERY_ID);

  return rows.map(r => ({
    type: "holder_spike",
    token: r.contract_address,
    holders_1h: Number(r.holders_1h || 0),
    holders_24h: Number(r.holders_24h || 0),
    growth_percent: Number(r.growth_percent || 0),
    observed_at: r.block_time,
    source: "dune_holder_spike",
    meta: {
      holders_1h: Number(r.holders_1h || 0),
      holders_24h: Number(r.holders_24h || 0),
      growth_percent: Number(r.growth_percent || 0)
    },
    score: 0
  }));

}

export async function getHolderSpikeSignals() {
  return getHolderSignals();
}

// =====================
// VOLUME SPIKES
// =====================

export async function getVolumeSignals() {

  const rows = await getLatestRows(VOLUME_QUERY_ID);

  return rows.map(r => ({
    type: "volume_spike",
    token: null,
    symbol: r.token_bought_symbol,
    tx_hash: r.tx_hash,
    wallet: r.taker,
    usd_value: Number(r.usd_value || r.trade_usd || 0),
    whales: Number(r.whale_wallets || 0),
    cluster_volume: Number(r.cluster_volume || 0),
    observed_at: r.block_time,
    source: "dune_volume",
    meta: {
      usd_value: Number(r.usd_value || r.trade_usd || 0),
      whale_wallets: Number(r.whale_wallets || 0),
      cluster_volume: Number(r.cluster_volume || 0),
      token_sold_symbol: r.token_sold_symbol
    },
    score: 0
  }));

}

// =====================
// SMART MONEY
// =====================

export async function getSmartMoneySignals() {

  const rows = await getLatestRows(SMART_QUERY_ID);

  return rows.map(r => ({
    type: "smart_money_buy",
    wallet: r.taker,
    symbol: r.token_bought_symbol,
    usd_value: Number(r.usd_value || r.amount_usd || 0),
    tx_hash: r.tx_hash,
    observed_at: r.block_time,
    source: "dune_smart",
    meta: {
      usd_value: Number(r.usd_value || r.amount_usd || 0),
      token_sold_symbol: r.token_sold_symbol
    },
    score: 0
  }));

}

// =====================
// MULTI WHALE
// =====================

export async function getMultiWhaleSignals() {

  const rows = await getLatestRows(MULTI_QUERY_ID);

  return rows.map(r => ({
    type: "multi_whale",
    symbol: r.token_bought_symbol,
    tx_hash: r.tx_hash,
    whales: Number(r.whale_wallets || 0),
    trades: Number(r.whale_trades || 0),
    usd_value: Number(r.trade_usd || 0),
    cluster_volume: Number(r.cluster_volume || 0),
    observed_at: r.block_time,
    source: "dune_multi_whale",
    meta: {
      whale_wallets: Number(r.whale_wallets || 0),
      whale_trades: Number(r.whale_trades || 0),
      cluster_volume: Number(r.cluster_volume || 0)
    },
    score: 0
  }));

}