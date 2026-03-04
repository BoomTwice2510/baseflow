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
const LOOKBACK_BLOCKS = 20;
const WHALE_THRESHOLD_USD = 100000;
const LIQUIDITY_MOVE_ETH = 10;

// === SWAP SELECTORS ===
const SWAP_SELECTORS = [
  "0x38ed1739",
  "0x18cbafe5",
  "0x7ff36ab5"
];

// === CACHE ===
let cachedBlocks = new Map();
let cachedETHPrice = null;
let lastPriceFetch = 0;

// === HELPERS ===

// ETH price
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

// === WALLET CLASSIFIER ===

function classifyWallet(txCount, volumeEth, tokenCount) {
  if (volumeEth > 100 && txCount > 30 && tokenCount > 5)
    return "smart_money";

  if (volumeEth > 50 && txCount > 20)
    return "whale";

  if (volumeEth > 5 && txCount > 10)
    return "active_trader";

  if (txCount > 3)
    return "retail";

  return "low_activity";
}

// === WALLET OVERVIEW ===

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
    if (!block?.transactions) continue;

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

  const walletClass = classifyWallet(txCount, totalVolume, tokens.size);

  const signals = [
    {
      id: `wallet-overview-${address}-${latestBlock}`,
      type: "wallet_overview",
      category: "liq",
      description: `Wallet activity on Base`,
      source: "base_rpc",
      observed_at: new Date().toISOString(),
      confidence: "medium",
      meta: {
        address,
        tx_count: txCount,
        volume_in_eth: Number(volumeIn.toFixed(4)),
        volume_out_eth: Number(volumeOut.toFixed(4)),
        unique_tokens_transfer: tokens.size,
        largest_single_tx_eth: Number(largestSingleTx.toFixed(4)),
        wallet_class: walletClass,
        agent_wallet: AGENT_WALLET
      }
    }
  ];

  if (walletClass === "smart_money") {
    signals.push({
      id: `smart-wallet-${address}`,
      type: "smart_money_wallet",
      category: "smart_money",
      description: "Smart money wallet candidate detected",
      confidence: "high",
      observed_at: new Date().toISOString(),
      source: "base_rpc",
      meta: {
        wallet: address,
        tx_count: txCount,
        volume_eth: totalVolume,
        token_diversity: tokens.size
      }
    });
  }

  return signals;
}

// === ACTIVE TOKEN DETECTOR WITH MOMENTUM ===

async function buildActiveTokenSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);

  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const tokenCounts = new Map();

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.data || !tx.to) continue;

      if (!tx.data.startsWith("0xa9059cbb")) continue;

      const token = tx.to.toLowerCase();

      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }
  }

  const sorted = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, 3);

  return top.map(([token, count], idx) => {
    let pumpSignal = null;

    if (count > 20) pumpSignal = "high_momentum";
    else if (count > 10) pumpSignal = "medium_momentum";

    return {
      id: `active-token-${latestBlock}-${idx}`,
      type: "active_token",
      category: "momentum",
      description: `Active token detected`,
      source: "base_rpc",
      observed_at: new Date().toISOString(),
      confidence: count >= 5 ? "medium" : "low",
      pump_signal: pumpSignal,
      meta: {
        token_address: token,
        transfer_count: count,
        rank: idx + 1
      }
    };
  });
}

// === WHALE DETECTION ===

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
          description: `Large transfer ~$${Math.round(usd)}`,
          source: "base_rpc",
          observed_at: new Date().toISOString(),
          confidence: "high",
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

// === DEX SWAP DETECTOR ===

async function buildDexSwapSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);

  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.data) continue;

      const method = tx.data.slice(0, 10);

      if (!SWAP_SELECTORS.includes(method)) continue;

      signals.push({
        id: `dex-swap-${tx.hash.slice(0, 8)}`,
        type: "dex_swap",
        category: "dex",
        description: "DEX swap detected",
        confidence: "medium",
        observed_at: new Date().toISOString(),
        source: "base_rpc",
        meta: {
          tx_hash: tx.hash,
          from: tx.from,
          to: tx.to,
          block: block.number
        }
      });
    }
  }

  return signals.slice(0, 5);
}

// === DEPLOY SIGNALS ===

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
    meta: {
      tx_hash: d.hash,
      block_number: d.block
    }
  }));
}

// === LIQUIDITY MIGRATION DETECTOR ===

async function buildLiquidityMigrationSignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);

  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const eth = tx.value ? Number(formatEther(tx.value)) : 0;

      if (eth > LIQUIDITY_MOVE_ETH) {
        signals.push({
          id: `liq-migration-${tx.hash.slice(0, 8)}`,
          type: "liquidity_migration",
          category: "liq",
          description: "Large liquidity movement detected",
          confidence: "medium",
          observed_at: new Date().toISOString(),
          source: "base_rpc",
          meta: {
            from: tx.from,
            to: tx.to,
            eth_value: eth,
            tx_hash: tx.hash
          }
        });
      }
    }
  }

  return signals.slice(0, 3);
}

// === CONTRACT ACTIVITY DETECTOR ===

async function buildContractActivitySignals(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.data) continue;

      if (tx.data !== "0x") {
        signals.push({
          id: `contract-call-${tx.hash.slice(0, 8)}`,
          type: "contract_interaction",
          category: "activity",
          description: "Contract interaction detected",
          source: "base_rpc",
          observed_at: new Date().toISOString(),
          confidence: "low",
          meta: {
            tx_hash: tx.hash,
            from: tx.from,
            to: tx.to,
            block: block.number
          }
        });
      }
    }
  }

  return signals.slice(0, 10);
}

// === ERC20 DEPLOY DETECTOR ===

async function detectERC20Deploys(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (tx.to !== null) continue;
      if (!tx.data) continue;

      if (tx.data.length > 2000) {
        signals.push({
          id: `token-deploy-${tx.hash.slice(0, 8)}`,
          type: "token_deploy",
          category: "token_launch",
          description: "Possible ERC20 token deployment",
          observed_at: new Date().toISOString(),
          source: "base_rpc",
          confidence: "medium",
          meta: {
            deployer: tx.from,
            tx_hash: tx.hash,
            block: block.number
          }
        });
      }
    }
  }

  return signals.slice(0, 3);
}

// === DEX ACTIVITY DETECTOR ===

async function detectDexActivity(latestBlock) {
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  const blocks = await getBlocksWithTx(fromBlock, latestBlock);

  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.data || tx.data === "0x") continue;

      const method = tx.data.slice(0, 10);

      if (SWAP_SELECTORS.includes(method)) {
        signals.push({
          id: `dex-activity-${tx.hash.slice(0, 8)}`,
          type: "dex_activity",
          category: "dex",
          description: "DEX router interaction detected",
          observed_at: new Date().toISOString(),
          source: "base_rpc",
          confidence: "medium",
          meta: {
            tx_hash: tx.hash,
            router: tx.to,
            trader: tx.from,
            block: block.number
          }
        });
      }
    }
  }

  return signals.slice(0, 5);
}

// === BLOCK OBSERVATION ===

function buildBlockObservation(latestBlock) {
  return {
    id: `bf-obs-${latestBlock}`,
    type: "block_observation",
    category: "block",
    description: `Watching Base block ${latestBlock}`,
    confidence: "low",
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

    const [
      tokens,
      deploys,
      whales,
      swaps,
      liquidity,
      contractActivity,
      tokenDeploys,
      dexActivity
    ] = await Promise.all([
      buildActiveTokenSignals(latestBlock),
      buildNewContractSignals(latestBlock),
      buildWhaleSignals(latestBlock),
      buildDexSwapSignals(latestBlock),
      buildLiquidityMigrationSignals(latestBlock),
      buildContractActivitySignals(latestBlock),
      detectERC20Deploys(latestBlock),
      detectDexActivity(latestBlock)
    ]);

    signals.push(
      ...tokens,
      ...deploys,
      ...whales,
      ...swaps,
      ...liquidity,
      ...contractActivity,
      ...tokenDeploys,
      ...dexActivity
    );

    signals.push(buildBlockObservation(latestBlock));

    // live blocks / top tokens / smart wallets
    const blocks = await getBlocksWithTx(
      Math.max(0, latestBlock - LOOKBACK_BLOCKS),
      latestBlock
    );

    const tokenCounts = new Map();

    for (const block of blocks) {
      if (!block?.transactions) continue;

      for (const tx of block.transactions) {
        if (!tx.data || !tx.to) continue;
        if (!tx.data.startsWith("0xa9059cbb")) continue;

        const token = tx.to.toLowerCase();
        tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
      }
    }

    const blockNumbers = blocks
      .map((b) => b?.number)
      .filter(Boolean);

    const smartWallets = signals
      .filter((s) => s.type === "smart_money_wallet")
      .map((s) => ({
        address: s.meta.wallet,
        volume_eth: s.meta.volume_eth
      }));

    return NextResponse.json({
      agent: "BaseFlow Signal Agent",
      chain: "Base",
      latest_block: latestBlock,
      updated_at: new Date().toISOString(),

      live_feed: {
        latest_blocks: blockNumbers.slice(-5)
      },

      top_tokens: Array.from(tokenCounts.entries())
        .slice(0, 5)
        .map(([token, count]) => ({
          token,
          transfers: count
        })),

      smart_wallets: smartWallets,

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
