// services/dune.js

const DUNE_API = "https://api.dune.com/api/v1";
const API_KEY = process.env.DUNE_API_KEY;

// ================= CORE HELPERS =================

async function executeQuery(queryId) {
  try {
    const res = await fetch(`${DUNE_API}/query/${queryId}/execute`, {
      method: "POST",
      headers: {
        "x-dune-api-key": API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({}), // no params currently
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Dune execute failed:", res.status, text);
      throw new Error("Dune execute failed " + res.status);
    }

    const data = await res.json(); // { execution_id, state, ... }
    return data.execution_id;
  } catch (err) {
    console.error("Dune executeQuery error:", err);
    throw err;
  }
}

async function waitForExecution(executionId, timeoutMs = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${DUNE_API}/execution/${executionId}/results`, {
        headers: { "x-dune-api-key": API_KEY },
      });

      if (!res.ok) {
        // transient error, wait & retry
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();

      if (data.state === "QUERY_STATE_COMPLETED" && data.result) {
        return data.result.rows || [];
      }

      if (
        data.state === "QUERY_STATE_FAILED" ||
        data.state === "QUERY_STATE_CANCELLED"
      ) {
        console.error("Dune execution failed state:", data.state);
        return [];
      }

      // still running
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error("Dune waitForExecution error:", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.warn("Dune execution timeout:", executionId);
  return [];
}

/**
 * Fetch rows with freshness control:
 * - Pehle latest stored result read karta hai.
 * - Agar generated_at / submitted_at <= maxAgeMinutes ho → wahi use.
 * - Agar purana ya missing ho → automatic executeQuery + waitForExecution.
 *
 * maxAgeMinutes = 120 → max 2 hours old data accept.
 */
async function getFreshRows(queryId, maxAgeMinutes = 120) {
  try {
    // 1) Try latest stored result
    const latestRes = await fetch(
      `${DUNE_API}/query/${queryId}/results`,
      { headers: { "x-dune-api-key": API_KEY } }
    );

    let needsExecute = !latestRes.ok;

    if (latestRes.ok) {
      const data = await latestRes.json(); // includes generated_at / submitted_at
      if (data.result && data.result.rows) {
        const generatedAt = data.generated_at || data.submitted_at;
        if (generatedAt) {
          const ageMs = Date.now() - new Date(generatedAt).getTime();
          const ageMin = ageMs / 60000;

          if (ageMin <= maxAgeMinutes) {
            // Recent enough → directly use stored result (cheap API Result Read)
            return data.result.rows;
          }
        }
      }

      // No result or too old → need fresh execution
      needsExecute = true;
    }

    if (!needsExecute) {
      return [];
    }

    // 2) Trigger new execution and wait
    const execId = await executeQuery(queryId);
    const rows = await waitForExecution(execId);
    return rows;
  } catch (err) {
    console.error("Dune getFreshRows error:", err);
    return [];
  }
}

// ================= SIGNAL HELPERS =================

// Whale transactions
export async function getWhaleSignals() {
  // Query ID: 6783085
  const rows = await getFreshRows(6783085, 120); // 2 hours

  return rows.map((r) => ({
    type: "whale_tx",
    wallet: r.from,
    amount: Number(r.eth_amount || r.amount_eth || 0),
    tx: r.hash,
    // optional fields for UI / scoring:
    observed_at: r.block_time || r.timestamp || null,
    source: "dune_whale",
  }));
}

// Token deploys
export async function getDeploySignals() {
  // Query ID: 6783176
  const rows = await getFreshRows(6783176, 120);

  return rows.map((r) => ({
    type: "token_deploy",
    creator: r.creator || r.deployer,
    contract: r.contract_address,
    observed_at: r.block_time || r.timestamp || null,
    source: "dune_deploy",
  }));
}

// Volume spikes
export async function getVolumeSignals() {
  // Query ID: 6783182
  const rows = await getFreshRows(6783182, 120);

  return rows.map((r) => ({
    type: "volume_spike",
    token: r.token_in_symbol || r.token_out_symbol || r.token_symbol,
    volume: Number(r.amount_usd || 0),
    observed_at: r.block_time || r.timestamp || null,
    source: "dune_volume",
  }));
}

// Smart money buys
export async function getSmartMoneySignals() {
  // Query ID: 6791926
  const rows = await getFreshRows(6791926, 120);

  return rows.map((r) => ({
    type: "smart_money_buy",
    wallet: r.trader,
    token: r.token_bought_address || r.token_bought_symbol,
    amount: Number(r.amount_usd || 0),
    tx: r.tx_hash,
    observed_at: r.block_time || r.timestamp || null,
    source: "dune_smart_money",
  }));
}

// Multi whale accumulation
export async function getMultiWhaleSignals() {
  // Query ID: 6792053
  const rows = await getFreshRows(6792053, 120);

  return rows.map((r) => ({
    type: "multi_whale",
    token: r.token_bought_symbol || r.token_symbol,
    whales: Number(r.whale_wallets || 0),
    volume: Number(r.cluster_volume || 0),
    tx: r.tx_hash,
    observed_at: r.block_time || r.timestamp || null,
    source: "dune_multi_whale",
  }));
}

// Token holder spike
export async function getHolderSpikeSignals() {
  // Query ID: 6792078
  const rows = await getFreshRows(6792078, 120);

  return rows
    .filter((r) => Number(r.holders_1h || 0) > 50)
    .map((r) => ({
      type: "holder_spike",
      token: r.contract_address,
      holders_1h: Number(r.holders_1h || 0),
      growth: Number(r.growth_percent || 0),
      observed_at: r.block_time || r.timestamp || null,
      source: "dune_holder_spike",
    }));
}
