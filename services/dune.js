const DUNE_API = "https://api.dune.com/api/v1/query";

async function fetchDune(queryId) {
  try {
    const res = await fetch(`${DUNE_API}/${queryId}/results`, {
      headers: {
        "x-dune-api-key": process.env.DUNE_API_KEY,
      },
    });

    if (!res.ok) {
      console.error("Dune status:", res.status);
      return [];
    }

    const data = await res.json();

    if (!data || !data.result) return [];

    return data.result.rows || [];
  } catch (err) {
    console.error("Dune fetch error:", err.message);
    return [];
  }
}

// Whale transactions
export async function getWhaleSignals() {
  const rows = await fetchDune(6783085);

  return rows.map((r) => ({
    type: "whale_tx",
    wallet: r.from,
    amount: Number(r.eth_amount || r.amount_eth || 0),
    tx: r.hash,
  }));
}

// Token deploys
export async function getDeploySignals() {
  const rows = await fetchDune(6783176);

  return rows.map((r) => ({
    type: "token_deploy",
    creator: r.creator || r.deployer,
    contract: r.contract_address,
  }));
}

// Volume spikes
export async function getVolumeSignals() {
  const rows = await fetchDune(6783182);

  return rows.map((r) => ({
    type: "volume_spike",
    token: r.token_in_symbol || r.token_out_symbol,
    amount: Number(r.amount_usd),
  }));
}

// Smart money buys
export async function getSmartMoneySignals() {
  const rows = await fetchDune(6791926);

  return rows.map((r) => ({
    type: "smart_money_buy",
    wallet: r.trader,
    token: r.token_bought_address || r.token_bought_symbol,
    amount: Number(r.amount_usd || 0),
    tx: r.tx_hash,
  }));
}

// Multi whale accumulation
export async function getMultiWhaleSignals() {
  const rows = await fetchDune(6792053);

  return rows.map((r) => ({
    type: "multi_whale",
    token: r.token_bought_symbol,
    whales: Number(r.whale_wallets),
    volume: Number(r.cluster_volume),
    tx: r.tx_hash,
  }));
}

// Token holder spike
export async function getHolderSpikeSignals() {
  const rows = await fetchDune(6792078);

  return rows
    .filter(r => Number(r.holders_1h) > 50)
    .map((r) => ({
      type: "holder_spike",
      token: r.contract_address,
      holders_1h: Number(r.holders_1h),
      growth: Number(r.growth_percent),
    }));
}