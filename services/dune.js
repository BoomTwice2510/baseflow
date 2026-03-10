// services/dune.js

const DUNE_API = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_API_KEY;
const RETRIES = 3;

// Generic fetch with retry + auth
async function fetchWithRetry(url, options = {}, retries = RETRIES) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "x-dune-api-key": API_KEY,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Dune API ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    console.error("Dune fetch failed:", err.message);
    return null;
  }
}

// Simple: read latest saved result from scheduler run
async function getLatestRows(queryId) {
  const data = await fetchWithRetry(
    `${DUNE_API}/query/${queryId}/results?limit=100`
  );
  if (!data) return [];
  return data.result?.rows || [];
}

// ==== WHALE SIGNALS ====

const WHALE_QUERY_ID = 6783085; // Whale Transactions (Base)

export async function getWhaleSignals() {
  const rows = await getLatestRows(WHALE_QUERY_ID);
  return rows.map((r) => ({
    type: "whale_tx",
    token: null,
    symbol: "ETH",
    tx_hash: r.hash,
    wallet_from: r.from,
    wallet_to: r.to,
    amount_eth: Number(r.eth_amount || r.ethamount || 0),
    usd_value: Number(r.usd_value || r.usdvalue || 0),
    observed_at: r.block_time || r.blocktime,
    source: "dune_whale",
    meta: {
      eth_amount: Number(r.eth_amount || r.ethamount || 0),
      usd_value: Number(r.usd_value || r.usdvalue || 0),
    },
    score: 0,
  }));
}

// ==== HOLDER SPIKES ====

const HOLDER_QUERY_ID = 6792078; // Token Holder Spike (Base)

export async function getHolderSignals() {
  const rows = await getLatestRows(HOLDER_QUERY_ID);
  return rows.map((r) => ({
    type: "holder_spike",
    token: r.contract_address || r.contractaddress,
    holders_1h: Number(r.holders_1h || r.holders1h || 0),
    holders_24h: Number(r.holders_24h || r.holders24h || 0),
    growth_percent: Number(r.growth_percent || r.growthpercent || 0),
    observed_at: r.block_time || r.blocktime,
    source: "dune_holder_spike",
    meta: {
      holders_1h: Number(r.holders_1h || r.holders1h || 0),
      holders_24h: Number(r.holders_24h || r.holders24h || 0),
      growth_percent: Number(r.growth_percent || r.growthpercent || 0),
    },
    score: 0,
  }));
}

// Backward‑compat export (route.js me getHolderSpikeSignals use ho raha tha)
export async function getHolderSpikeSignals() {
  return getHolderSignals();
}

// ==== DEX VOLUME SPIKES ====

const VOLUME_QUERY_ID = 6783182; // DEX Volume Spike (Base)

export async function getVolumeSignals() {
  const rows = await getLatestRows(VOLUME_QUERY_ID);
  return rows.map((r) => ({
    type: "volume_spike",
    token: null,
    symbol: r.token_bought_symbol || r.tokenboughtsymbol || null,
    tx_hash: r.tx_hash || r.txhash,
    wallet: r.taker,
    usd_value: Number(
      r.usd_value || r.usdvalue || r.trade_usd || r.tradeusd || 0
    ),
    whales: Number(r.whale_wallets || r.whalewallets || 0),
    cluster_volume: Number(r.cluster_volume || r.clustervolume || 0),
    observed_at: r.block_time || r.blocktime,
    source: "dune_volume",
    meta: {
      usd_value: Number(
        r.usd_value || r.usdvalue || r.trade_usd || r.tradeusd || 0
      ),
      whale_wallets: Number(r.whale_wallets || r.whalewallets || 0),
      cluster_volume: Number(r.cluster_volume || r.clustervolume || 0),
      token_sold_symbol:
        r.token_sold_symbol || r.tokensoldsymbol || null,
    },
    score: 0,
  }));
}

// ==== SMART MONEY BUYS ====

const SMART_QUERY_ID = 6791926; // Smart Money Buys (Base)

export async function getSmartMoneySignals() {
  const rows = await getLatestRows(SMART_QUERY_ID);
  return rows.map((r) => ({
    type: "smart_money_buy",
    wallet: r.taker,
    symbol: r.token_bought_symbol || r.tokenboughtsymbol || null,
    usd_value: Number(
      r.usd_value || r.usdvalue || r.amount_usd || r.amountusd || 0
    ),
    tx_hash: r.tx_hash || r.txhash,
    observed_at: r.block_time || r.blocktime,
    source: "dune_smart",
    meta: {
      usd_value: Number(
        r.usd_value || r.usdvalue || r.amount_usd || r.amountusd || 0
      ),
      token_sold_symbol:
        r.token_sold_symbol || r.tokensoldsymbol || null,
    },
    score: 0,
  }));
}

// ==== MULTI-WHALE CLUSTERS ====

const MULTI_QUERY_ID = 6792053; // Multi-Whale Accumulation (Base)

export async function getMultiWhaleSignals() {
  const rows = await getLatestRows(MULTI_QUERY_ID);
  return rows.map((r) => ({
    type: "multi_whale",
    symbol: r.token_bought_symbol || r.tokenboughtsymbol || null,
    tx_hash: r.tx_hash || r.txhash,
    whales: Number(r.whale_wallets || r.whalewallets || 0),
    trades: Number(r.whale_trades || r.whaletrades || 0),
    usd_value: Number(
      r.trade_usd || r.tradeusd || r.usd_value || r.usdvalue || 0
    ),
    cluster_volume: Number(r.cluster_volume || r.clustervolume || 0),
    observed_at: r.block_time || r.blocktime,
    source: "dune_multi_whale",
    meta: {
      whale_wallets: Number(r.whale_wallets || r.whalewallets || 0),
      whale_trades: Number(r.whale_trades || r.whaletrades || 0),
      cluster_volume: Number(r.cluster_volume || r.clustervolume || 0),
    },
    score: 0,
  }));
}
