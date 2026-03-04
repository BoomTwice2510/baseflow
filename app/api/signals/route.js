// app/api/signals/route.js

import { NextResponse } from "next/server";
import { JsonRpcProvider, formatEther } from "ethers";

// === PROVIDER SETUP ===
const PROVIDER_URL =
  process.env.BASE_RPC_URL || "https://mainnet.base.org";

const provider = new JsonRpcProvider(PROVIDER_URL);

// === AGENT META ===
const AGENT_WALLET = "0x0A06A1082EFC81a01bb5f7F3593aa937d8c7e79f";
const AGENT_8004_URL = "https://www.8004scan.io/agents/base/2387";
const AGENT_8004_ID = 2387;

// === CONFIG ===
const LOOKBACK_BLOCKS = 40;
const WHALE_THRESHOLD_USD = 100000;

// === GLOBAL CACHE ===
let cachedBlocks = new Map();
let lastFetchedBlock = 0;
let cachedETHPrice = null;
let lastPriceFetch = 0;

// === HELPERS ===

// ETH price fetch
async function getETHPrice() {
  const now = Date.now();
  if (cachedETHPrice && now - lastPriceFetch < 60000) {
    return cachedETHPrice;
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await res.json();
    cachedETHPrice = data.ethereum.usd;
    lastPriceFetch = now;
    return cachedETHPrice;
  } catch {
    return 3000;
  }
}

// cached block loader
async function getBlocksWithTx(fromBlock, toBlock) {
  const blocks = [];

  for (let i = fromBlock; i <= toBlock; i++) {
    if (cachedBlocks.has(i)) {
      blocks.push(cachedBlocks.get(i));
      continue;
    }

    const block = await provider.getBlock(i, true);
    cachedBlocks.set(i, block);
    blocks.push(block);
  }

  return blocks;
}

// === WALLET OVERVIEW (original logic preserved) ===

async function buildWalletOverview(address, latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  let txCount = 0;
  let volumeIn = 0;
  let volumeOut = 0;
  const tokens = new Set();

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

  if (txCount > 0) score += Math.min(txCount / 20, 1) * 30;
  if (totalVolume > 0) score += Math.min(totalVolume / 5, 1) * 30;
  if (tokens.size > 0) score += Math.min(tokens.size / 10, 1) * 20;
  if (largestSingleTx > 0) score += Math.min(largestSingleTx / 1, 1) * 10;
  if (selfTransfers > 0) score += Math.min(selfTransfers / 5, 1) * 10;

  const riskScore = Math.round(score);

  return [
    {
      id: `wallet-overview-${address}-${latestBlock}`,
      type: "wallet_overview",
      category: "liq",
      description: `Wallet activity on Base (last ${LOOKBACK_BLOCKS} blocks).`,
      source: "base_rpc",
      observed_at: new Date().toISOString(),
      confidence: "medium",
      confidence_score: riskScore / 100,
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

// === ACTIVE TOKEN DETECTOR (unchanged logic) ===

async function buildActiveTokenSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const tokenCounts = new Map();
  const selector = "0xa9059cbb";

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.to || !tx.data) continue;
      if (!tx.data.startsWith(selector)) continue;

      const token = tx.to.toLowerCase();
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }
  }

  const sorted = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3);

  return top.map(([token, count], idx) => ({
    id: `active-token-${latestBlock}-${idx}`,
    type: "active_token",
    category: "momentum",
    description: `Active token detected: ${token}`,
    source: "base_rpc",
    observed_at: new Date().toISOString(),
    confidence: count >= 5 ? "medium" : "low",
    confidence_score: Math.min(count / 10, 1),
    meta: {
      token_address: token,
      transfer_count: count,
      rank: idx + 1,
      agent_wallet: AGENT_WALLET
    }
  }));
}

// === DEX / WHALE DETECTOR ===

async function buildWhaleSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const ethPrice = await getETHPrice();
  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const eth = tx.value ? Number(formatEther(tx.value)) : 0;
      const usd = eth * ethPrice;

      if (usd > WHALE_THRESHOLD_USD) {
        signals.push({
          id: `whale-${tx.hash.slice(0, 10)}`,
          type: "whale_transfer",
          category: "whale",
          description: `Large transfer detected (~$${Math.round(usd)})`,
          source: "base_rpc",
          observed_at: new Date().toISOString(),
          confidence: "high",
          confidence_score: 0.9,
          meta: {
            tx_hash: tx.hash,
            block_number: block.number,
            eth_value: eth,
            usd_value: Math.round(usd),
            from: tx.from,
            to: tx.to
          }
        });
      }
    }
  }

  return signals.slice(0, 5);
}

// === DEPLOY SIGNALS (original logic preserved) ===

async function buildNewContractSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const deploys = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (tx.to === null) {
        deploys.push({
          hash: tx.hash,
          block: block.number
        });
      }
    }
  }

  return deploys.slice(0, 3).map((d, idx) => ({
    id: `deploy-${d.block}-${idx}`,
    type: "contract_deployment",
    category: "deploy",
    description: `New contract deployment ${d.hash.slice(0, 10)}`,
    source: "base_rpc",
    observed_at: new Date().toISOString(),
    confidence: "low",
    confidence_score: 0.3,
    meta: {
      tx_hash: d.hash,
      block_number: d.block
    }
  }));
}

// === BLOCK OBSERVATION ===

function buildBlockObservation(latestBlock) {
  return {
    id: `bf-obs-${latestBlock}`,
    type: "block_observation",
    category: "block",
    description: `Watching Base block ${latestBlock}.`,
    confidence: "low",
    confidence_score: 0.1,
    observed_at: new Date().toISOString(),
    source: "base_rpc"
  };
}

// === MAIN HANDLER ===

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address")?.toLowerCase() || null;

    const latestBlock = await provider.getBlockNumber();

    const signals = [];

    if (address) {
      signals.push(...(await buildWalletOverview(address, latestBlock)));
    }

    const [activeTokens, deploys, whales] = await Promise.all([
      buildActiveTokenSignals(latestBlock),
      buildNewContractSignals(latestBlock),
      buildWhaleSignals(latestBlock)
    ]);

    signals.push(...activeTokens, ...deploys, ...whales);

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
        message: err?.message || "unknown error"
      },
      { status: 500 }
    );
  }
}