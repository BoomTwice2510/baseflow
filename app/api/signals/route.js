// app/api/signals/route.js

import { NextResponse } from "next/server";
import { JsonRpcProvider, formatEther } from "ethers";

// === PROVIDER SETUP ===
const PROVIDER_URL =
  process.env.BASE_RPC_URL || "https://mainnet.base.org";

const provider = new JsonRpcProvider(PROVIDER_URL);

// === AGENT / ERC‑8004 META ===
const AGENT_WALLET = "0x0A06A1082EFC81a01bb5f7F3593aa937d8c7e79f";
const AGENT_8004_URL = "https://www.8004scan.io/agents/base/2387";
const AGENT_8004_ID = 2387;

// === CONFIG ===
const LOOKBACK_BLOCKS = 40; // wallet + active tokens + deploys window

// === HELPERS ===

// Ethers v6: getBlock(number, includeTransactions = true)
async function getBlocksWithTx(fromBlock, toBlock) {
  const blockPromises = [];
  for (let i = fromBlock; i <= toBlock; i++) {
    blockPromises.push(provider.getBlock(i, true));
  }
  return Promise.all(blockPromises);
}

// Wallet overview + risk v2
async function buildWalletOverview(address, latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  let txCount = 0;
  let volumeIn = 0;
  let volumeOut = 0;
  const tokens = new Set();

  // extra patterns
  let selfTransfers = 0;
  let largestSingleTx = 0;

  for (const block of blocks) {
    if (!block || !block.transactions) continue;

    for (const tx of block.transactions) {
      const from = tx.from?.toLowerCase();
      const to = tx.to?.toLowerCase();

      if (from !== address && to !== address) continue;

      txCount++;

      const ethValue = tx.value ? Number(formatEther(tx.value)) : 0;
      if (to === address) volumeIn += ethValue;
      if (from === address) volumeOut += ethValue;

      if (ethValue > largestSingleTx) largestSingleTx = ethValue;
      if (from === address && to === address) selfTransfers++;

      if (tx.data && tx.data.startsWith("0xa9059cbb") && tx.to) {
        tokens.add(tx.to.toLowerCase());
      }
    }
  }

  const totalVolume = volumeIn + volumeOut;
  let score = 0;

  // tx count contribution (0–30)
  if (txCount > 0) {
    const txNorm = Math.min(txCount / 20, 1);
    score += txNorm * 30;
  }

  // volume contribution (0–30)
  if (totalVolume > 0) {
    const volNorm = Math.min(totalVolume / 5, 1); // 5+ ETH => max
    score += volNorm * 30;
  }

  // token diversity contribution (0–20)
  if (tokens.size > 0) {
    const tokNorm = Math.min(tokens.size / 10, 1);
    score += tokNorm * 20;
  }

  // largest single tx (0–10)
  if (largestSingleTx > 0) {
    const bigNorm = Math.min(largestSingleTx / 1, 1); // 1+ ETH
    score += bigNorm * 10;
  }

  // self‑transfer weirdness (small boost)
  if (selfTransfers > 0) {
    const selfNorm = Math.min(selfTransfers / 5, 1);
    score += selfNorm * 10;
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(score)));

  return [
    {
      id: `wallet-overview-${address}-${latestBlock}`,
      type: "wallet_overview",
      category: "liq",
      description: `Wallet activity on Base (last ${LOOKBACK_BLOCKS} blocks).`,
      source: "base_rpc",
      observed_at: new Date().toISOString(),
      confidence: "medium",
      meta: {
        address,
        lookback_blocks: LOOKBACK_BLOCKS,
        tx_count: txCount,
        volume_in_eth: Number(volumeIn.toFixed(4)),
        volume_out_eth: Number(volumeOut.toFixed(4)),
        unique_tokens_transfer: tokens.size,
        largest_single_tx_eth: Number(largestSingleTx.toFixed(4)),
        self_transfers: selfTransfers,
        risk_score: riskScore,
        agent_wallet: AGENT_WALLET,
        agent_8004_id: AGENT_8004_ID
      }
    }
  ];
}

// Active tokens detector (simple, not USD‑based)
async function buildActiveTokenSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const transferSelector = "0xa9059cbb";
  const tokenCounts = new Map();

  for (const block of blocks) {
    if (!block || !block.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.to || !tx.data) continue;
      if (!tx.data.startsWith(transferSelector)) continue;

      const token = tx.to.toLowerCase();
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }
  }

  const sorted = Array.from(tokenCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const top = sorted.slice(0, 3);

  return top.map(([token, count], idx) => ({
    id: `active-token-${latestBlock}-${idx}`,
    type: "active_token",
    category: "vol",
    description: `Active token detected: ${token} (${count} transfers in last ${LOOKBACK_BLOCKS} blocks).`,
    source: "base_rpc",
    observed_at: new Date().toISOString(),
    confidence: count >= 5 ? "medium" : "low",
    meta: {
      token_address: token,
      transfer_count: count,
      rank: idx + 1,
      lookback_blocks: LOOKBACK_BLOCKS,
      agent_wallet: AGENT_WALLET,
      agent_8004_id: AGENT_8004_ID
    }
  }));
}

// New contract deployments
async function buildNewContractSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const deploys = [];

  for (const block of blocks) {
    if (!block || !block.transactions) continue;

    for (const tx of block.transactions) {
      if (tx.to !== null) continue; // contract deployment in EVM: to == null

      const from = tx.from?.toLowerCase();
      deploys.push({
        from,
        hash: tx.hash,
        blockNumber: block.number
      });
    }
  }

  return deploys.map((d, idx) => ({
    id: `deploy-${d.blockNumber}-${idx}`,
    type: "contract_deployment",
    category: "deploy",
    description: `New contract deployment tx ${d.hash.slice(
      0,
      10
    )}… in last ${LOOKBACK_BLOCKS} blocks.`,
    source: "base_rpc",
    observed_at: new Date().toISOString(),
    confidence: "low",
    meta: {
      from: d.from,
      tx_hash: d.hash,
      block_number: d.blockNumber,
      basescan_tx_url: `https://basescan.org/tx/${d.hash}`,
      lookback_blocks: LOOKBACK_BLOCKS,
      agent_wallet: AGENT_WALLET,
      agent_8004_id: AGENT_8004_ID
    }
  }));
}

// Simple block observation fallback
function buildBlockObservation(latestBlock) {
  return {
    id: `bf-obs-${latestBlock}`,
    type: "block_observation",
    category: "block",
    description: `Watching Base block ${latestBlock}.`,
    confidence: "low",
    observed_at: new Date().toISOString(),
    source: "base_rpc",
    note:
      "No specific wallet or token events highlighted in the current lookback window.",
    meta: {
      searched_from_block: Math.max(0, latestBlock - LOOKBACK_BLOCKS),
      searched_to_block: latestBlock,
      lookback_blocks: LOOKBACK_BLOCKS,
      agent_wallet: AGENT_WALLET,
      agent_8004_id: AGENT_8004_ID
    }
  };
}

// === MAIN HANDLER ===

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const addressParam = searchParams.get("address");
    const address = addressParam ? addressParam.toLowerCase() : null;

    const latestBlock = await provider.getBlockNumber();

    const signals = [];

    // Wallet overview if address given
    if (address) {
      const walletSignals = await buildWalletOverview(address, latestBlock);
      signals.push(...walletSignals);
    }

    // Active tokens + new deploys (always)
    const [activeTokens, newDeploys] = await Promise.all([
      buildActiveTokenSignals(latestBlock),
      buildNewContractSignals(latestBlock)
    ]);
    signals.push(...activeTokens, ...newDeploys);

    // Fallback block observation (always add one)
    signals.push(buildBlockObservation(latestBlock));

    return NextResponse.json({
      agent: "BaseFlow Signal Agent",
      chain: "Base",
      latest_block: latestBlock,
      updated_at: new Date().toISOString(),
      erc8004: {
        network: "base",
        agent_id: AGENT_8004_ID,
        agent_wallet: AGENT_WALLET,
        explorer_url: AGENT_8004_URL
      },
      signals
    });
  } catch (err) {
    console.error("Signal agent error", err);
    return NextResponse.json(
      {
        error: "BaseFlow Signal Agent failed",
        message: err?.message || "unknown error",
        erc8004: {
          network: "base",
          agent_id: AGENT_8004_ID,
          agent_wallet: AGENT_WALLET,
          explorer_url: AGENT_8004_URL
        }
      },
      { status: 500 }
    );
  }
}
