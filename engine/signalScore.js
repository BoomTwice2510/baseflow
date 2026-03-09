// engine/signalScore.js

export function scoreSignal(s) {
  let score = 0;

  const now = Date.now();

  // ===== RECENCY BONUS =====
  if (s.observed_at) {
    const age = now - new Date(s.observed_at).getTime();
    if (age < 5 * 60 * 1000) score += 2;
    else if (age < 15 * 60 * 1000) score += 1;
  }

  // ===== TYPE-SPECIFIC SCORES =====

    // L1 ETH whale transfers
    if (s.type === "whale_tx") {
  const eth = Number(s.amount_eth || s.meta?.eth_amount || s.amount || 0);
  let usd = Number(s.usd_value || s.meta?.usd_value || 0);

  // Fallback: approximate USD from ETH if Dune price join failed
  if (!usd && eth) {
    const assumedPrice = 3000; // conservative estimate
    usd = eth * assumedPrice;
  }

  if (usd > 300000) score += 8;
  else if (usd > 150000) score += 6;
  else if (usd > 75000) score += 5;
  else if (usd > 50000) score += 4;
    }


  // DEX volume spikes
  if (s.type === "volume_spike") {
    const vol =
      Number(s.cluster_volume || 0) ||
      Number(s.meta?.cluster_volume || 0) ||
      Number(s.usd_value || 0);

    if (vol > 500000) score += 7;
    else if (vol > 250000) score += 5;
    else if (vol > 150000) score += 4;
  }

  // Liquidity added (from Dexscreener engine)
  if (s.type === "liquidity_added") {
    const liq = Number(s.liquidity || s.meta?.liquidity || 0);

    if (liq > 500000) score += 7;
    else if (liq > 250000) score += 5;
    else if (liq > 150000) score += 4;
  }

  // Smart money buys
  if (s.type === "smart_money_buy") {
    const amt = Number(s.usd_value || s.amount || s.meta?.usd_value || 0);

    if (amt > 300000) score += 8;
    else if (amt > 150000) score += 7;
    else if (amt > 75000) score += 6;
    else if (amt > 50000) score += 5;
  }

  // Multi-whale accumulation
  if (s.type === "multi_whale") {
    const whales = Number(s.whales || s.meta?.whale_wallets || 0);
    const vol =
      Number(s.cluster_volume || 0) ||
      Number(s.meta?.cluster_volume || 0);

    if (whales >= 5 && vol > 500000) score += 8;
    else if (whales >= 3 && vol > 300000) score += 7;
    else if (whales >= 3 && vol > 150000) score += 5;
  }

  // Holder spike (from Dune)
  if (s.type === "holder_spike") {
    const holders = Number(s.holders_1h || s.meta?.holders_1h || 0);

    if (holders > 800) score += 7;
    else if (holders > 400) score += 6;
    else if (holders > 200) score += 4;
    else if (holders > 150) score += 3;
  }

  // Uniswap new pools
  if (s.type === "uniswap_pool_created") {
    score += 3; // base, correlation + other context decide final rank
  }

  // Gas spikes
  if (s.type === "gas_spike") {
    const g = Number(s.gas || s.meta?.gas || 0);
    if (g > 2e9) score += 4;
    else if (g > 1e9) score += 3;
  }

  return score;
}
