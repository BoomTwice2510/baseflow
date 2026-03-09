// services/dune.js

const DUNE_API = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_API_KEY;

const MAX_CACHE = 5000;
const RETRIES = 3;

// ============ API HELPERS ============

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
      await new Promise((r) => setTimeout(r, 1000));
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

// ============ NORMALIZED HELPERS ============

function toIso(ts) {
  if (!ts) return new Date().toISOString();
  try {
    return new Date(ts).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ============ SIGNAL MAPPERS ============

// 1) Whale transactions (Base ETH whales) – query 6783085
export async function getWhaleSignals() {
  const rows = await getLatestRows(6783085);

  const localSeen = new Set();

  return rows
    .filter(
      (r) => r.hash && !localSeen.has(r.hash) && localSeen.add(r.hash)
    )
    .map((r) => {
      const ethAmount = Number(r.eth_amount || 0);
      const usd = Number(r.usd_value || 0);

      return {
        type: "whale_tx",
        token: null, // L1 transfer, no direct token
        symbol: "ETH",
        tx_hash: r.hash,
        wallet_from: r.from,
        wallet_to: r.to,
        amount_eth: ethAmount,
        usd_value: usd,
        observed_at: toIso(r.block_time),
        source: "dune_whale",
        meta: {
          eth_amount: ethAmount,
          usd_value: usd,
        },
      };
    });
}

// 2) DEX volume spike – query 6783182
export async function getVolumeSignals() {
  const rows = await getLatestRows(6783182);

  const localSeen = new Set();

  return rows
    .filter(
      (r) =>
        r.tx_hash &&
        !localSeen.has(r.tx_hash) &&
        localSeen.add(r.tx_hash)
    )
    .map((r) => {
      const usd = Number(r.usd_value || 0);
      const clusterVolume = Number(r.cluster_volume || 0);

      return {
        type: "volume_spike",
        token: null, // token address later from resolver / RPC
        symbol: r.token_bought_symbol || null,
        tx_hash: r.tx_hash,
        wallet: r.taker,
        usd_value: usd,
        observed_at: toIso(r.block_time),
        source: "dune_volume",
        meta: {
          usd_value: usd,
          whale_wallets: Number(r.whale_wallets || 0),
          cluster_volume: clusterVolume,
          token_sold_symbol: r.token_sold_symbol || null,
        },
      };
    });
}

// 3) Smart money buys – query 6791926
export async function getSmartMoneySignals() {
  const rows = await getLatestRows(6791926);

  return rows
    .filter((r) => !["USDC", "USDT"].includes(r.token_bought_symbol))
    .map((r) => {
      const usd = Number(r.usd_value || 0);

      return {
        type: "smart_money_buy",
        token: null,
        symbol: r.token_bought_symbol || null,
        tx_hash: r.tx_hash,
        wallet: r.taker,
        usd_value: usd,
        observed_at: toIso(r.block_time),
        source: "dune_smart_money",
        meta: {
          usd_value: usd,
          token_sold_symbol: r.token_sold_symbol || null,
        },
      };
    });
}

// 4) Multi-whale accumulation – query 6792053
export async function getMultiWhaleSignals() {
  const rows = await getLatestRows(6792053);

  return rows.map((r) => {
    const whales = Number(r.whale_wallets || 0);
    const clusterVolume = Number(
      r.whale_volume || r.cluster_volume || 0
    );

    return {
      type: "multi_whale",
      token: r.token_bought_address || null,
      symbol: r.token_bought_symbol || null,
      tx_hash: r.tx_hash,
      whales,
      observed_at: toIso(r.block_time || r.timestamp),
      source: "dune_multi_whale",
      meta: {
        whale_wallets: whales,
        whale_trades: Number(r.whale_trades || 0),
        cluster_volume: clusterVolume,
      },
    };
  });
}

// 5) Holder spike – query 6792078
export async function getHolderSpikeSignals() {
  const rows = await getLatestRows(6792078);

  return rows
    .filter((r) => Number(r.holders_1h || 0) > 0)
    .map((r) => {
      const h1 = Number(r.holders_1h || 0);
      const h24 = Number(r.holders_24h || 0);
      const growth = Number(r.growth_percent || 0);

      return {
        type: "holder_spike",
        token: r.contract_address || null,
        symbol: null,
        tx_hash: null,
        holders_1h: h1,
        holders_24h: h24,
        growth_percent: growth,
        observed_at: new Date().toISOString(), // fresh signal
        source: "dune_holder_spike",
        meta: {
          holders_1h: h1,
          holders_24h: h24,
          growth_percent: growth,
        },
      };
    });
}
