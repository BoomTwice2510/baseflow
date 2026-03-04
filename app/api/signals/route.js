// app/api/signals/route.js

import { NextResponse } from "next/server";
import { JsonRpcProvider, formatEther } from "ethers";

// =======================
// PROVIDER
// =======================

const PROVIDER_URL =
  process.env.BASE_RPC_URL || "https://mainnet.base.org";

const provider = new JsonRpcProvider(PROVIDER_URL);

// =======================
// AGENT META
// =======================

const AGENT_WALLET = "0x0A06A1082EFC81a01bb5f7F3593aa937d8c7e79f";
const AGENT_8004_URL = "https://www.8004scan.io/agents/base/2387";
const AGENT_8004_ID = 2387;

// =======================
// CONFIG
// =======================

const LOOKBACK_BLOCKS = 20;
const WHALE_THRESHOLD_USD = 100000;
const LIQUIDITY_MOVE_ETH = 10;

// =======================
// SWAP SELECTORS
// =======================

const SWAP_SELECTORS = [
  "0x38ed1739",
  "0x18cbafe5",
  "0x7ff36ab5"
];

// =======================
// HELPERS
// =======================

let cachedETHPrice = null;
let lastPriceFetch = 0;

async function getETHPrice() {
  const now = Date.now();

  if (cachedETHPrice && now - lastPriceFetch < 60000)
    return cachedETHPrice;

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

async function getBlocksWithTx(fromBlock, toBlock) {
  const numbers = [];

  for (let i = fromBlock; i <= toBlock; i++) {
    numbers.push(i);
  }

  const blocks = await Promise.all(
    numbers.map(n => provider.getBlock(n, true))
  );

  return blocks;
}

// hydrateTransactions abhi use nahi ho raha, future ke liye rehne de rahe hain
async function hydrateTransactions(blocks) {
  const txHashes = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (typeof tx === "string") {
        txHashes.push(tx);
      } else {
        txHashes.push(tx.hash);
      }
    }
  }

  const uniqueHashes = [...new Set(txHashes)];

  const txs = await Promise.all(
    uniqueHashes.map(h => provider.getTransaction(h))
  );

  const txMap = new Map();

  txs.forEach(tx => {
    if (tx) txMap.set(tx.hash, tx);
  });

  for (const block of blocks) {
    if (!block?.transactions) continue;

    block.transactions = block.transactions
      .map(tx => {
        const hash = typeof tx === "string" ? tx : tx.hash;
        return txMap.get(hash);
      })
      .filter(Boolean);
  }

  return blocks;
}

// =======================
// WALLET CLASSIFIER
// =======================

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

// =======================
// WALLET OVERVIEW
// =======================

function buildWalletOverview(address, blocks) {
  let txCount = 0;
  let volumeIn = 0;
  let volumeOut = 0;

  const tokens = new Set();

  let largestSingleTx = 0;

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const from = tx.from?.toLowerCase();
      const to = tx.to?.toLowerCase();

      if (from !== address && to !== address) continue;

      txCount++;

      const eth = tx.value ? Number(formatEther(tx.value)) : 0;

      if (to === address) volumeIn += eth;
      if (from === address) volumeOut += eth;

      if (eth > largestSingleTx) largestSingleTx = eth;

      if (tx.data && tx.data.startsWith("0xa9059cbb") && tx.to) {
        tokens.add(tx.to.toLowerCase());
      }
    }
  }

  const totalVolume = volumeIn + volumeOut;

  const walletClass = classifyWallet(txCount, totalVolume, tokens.size);

  const signals = [{
    id: `wallet-overview-${address}`,
    type: "wallet_overview",
    category: "liq",
    description: "Wallet activity on Base",
    confidence: "medium",
    observed_at: new Date().toISOString(),
    source: "base_rpc",
    meta: {
      address,
      tx_count: txCount,
      volume_in_eth: Number(volumeIn.toFixed(4)),
      volume_out_eth: Number(volumeOut.toFixed(4)),
      unique_tokens_transfer: tokens.size,
      largest_single_tx_eth: largestSingleTx,
      wallet_class: walletClass
    }
  }];

  if (walletClass === "smart_money") {
    signals.push({
      id: `smart-wallet-${address}`,
      type: "smart_money_wallet",
      category: "smart_money",
      description: "Smart money wallet detected",
      confidence: "high",
      observed_at: new Date().toISOString(),
      source: "base_rpc",
      meta: {
        wallet: address,
        volume_eth: totalVolume,
        token_diversity: tokens.size
      }
    });
  }

  return signals;
}

// =======================
// ACTIVE TOKENS
// =======================

function buildActiveTokenSignals(blocks) {
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

  const signals = top.map(([token, count], idx) => ({
    id: `active-token-${idx}`,
    type: "active_token",
    category: "momentum",
    description: "Active token detected",
    source: "base_rpc",
    observed_at: new Date().toISOString(),
    confidence: count > 10 ? "high" : "medium",
    meta: {
      token_address: token,
      transfer_count: count
    }
  }));

  return { signals, tokenCounts };
}

// =======================
// WHALE DETECTOR
// =======================

async function buildWhaleSignals(blocks) {
  const ethPrice = await getETHPrice();

  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const eth = tx.value ? Number(formatEther(tx.value)) : 0;

      const usd = eth * ethPrice;

      if (usd > WHALE_THRESHOLD_USD) {
        signals.push({
          id: `whale-${tx.hash.slice(0, 8)}`,
          type: "whale_transfer",
          category: "whale",
          description: `Large transfer ~$${Math.round(usd)}`,
          source: "base_rpc",
          observed_at: new Date().toISOString(),
          confidence: "high",
          meta: {
            tx_hash: tx.hash,
            from: tx.from,
            to: tx.to,
            eth_value: eth
          }
        });
      }
    }
  }

  return signals.slice(0, 5);
}

// =======================
// DEX SWAPS
// =======================

function buildDexSwapSignals(blocks) {
  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.data) continue;

      const method = tx.data.slice(0, 10);

      if (!SWAP_SELECTORS.includes(method)) continue;

      signals.push({
        id: `dex-${tx.hash.slice(0, 8)}`,
        type: "dex_swap",
        category: "dex",
        description: "DEX swap detected",
        observed_at: new Date().toISOString(),
        confidence: "medium",
        source: "base_rpc",
        meta: {
          tx_hash: tx.hash,
          trader: tx.from,
          router: tx.to
        }
      });
    }
  }

  return signals.slice(0, 5);
}

// =======================
// CONTRACT DEPLOY
// =======================

function buildNewContractSignals(blocks) {
  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (tx.to === null) {
        signals.push({
          id: `deploy-${tx.hash.slice(0, 8)}`,
          type: "contract_deployment",
          category: "deploy",
          description: "New contract deployment",
          observed_at: new Date().toISOString(),
          confidence: "low",
          source: "base_rpc",
          meta: {
            tx_hash: tx.hash,
            deployer: tx.from
          }
        });
      }
    }
  }

  return signals.slice(0, 5);
}

// =======================
// LIQUIDITY MOVES
// =======================

function buildLiquidityMigrationSignals(blocks) {
  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const eth = tx.value ? Number(formatEther(tx.value)) : 0;

      if (eth > LIQUIDITY_MOVE_ETH) {
        signals.push({
          id: `liq-${tx.hash.slice(0, 8)}`,
          type: "liquidity_migration",
          category: "liq",
          description: "Large liquidity movement detected",
          observed_at: new Date().toISOString(),
          confidence: "medium",
          source: "base_rpc",
          meta: {
            from: tx.from,
            to: tx.to,
            eth_value: eth
          }
        });
      }
    }
  }

  return signals.slice(0, 5);
}

// =======================
// CONTRACT ACTIVITY
// =======================

function buildContractActivitySignals(blocks) {
  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (!tx.data || tx.data === "0x") continue;

      signals.push({
        id: `contract-${tx.hash.slice(0, 8)}`,
        type: "contract_interaction",
        category: "activity",
        description: "Contract interaction detected",
        observed_at: new Date().toISOString(),
        confidence: "low",
        source: "base_rpc",
        meta: {
          tx_hash: tx.hash,
          from: tx.from,
          to: tx.to
        }
      });
    }
  }

  return signals.slice(0, 10);
}

// =======================
// TOKEN DEPLOY
// =======================

function detectERC20Deploys(blocks) {
  const signals = [];

  for (const block of blocks) {
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      if (tx.to !== null) continue;
      if (!tx.data) continue;

      if (tx.data.length > 2000) {
        signals.push({
          id: `token-${tx.hash.slice(0, 8)}`,
          type: "token_deploy",
          category: "token_launch",
          description: "Possible ERC20 token deployment",
          observed_at: new Date().toISOString(),
          confidence: "medium",
          source: "base_rpc",
          meta: {
            deployer: tx.from,
            tx_hash: tx.hash
          }
        });
      }
    }
  }

  return signals.slice(0, 3);
}

// =======================
// BLOCK OBSERVATION
// =======================

function buildBlockObservation(latestBlock) {
  return {
    id: `block-${latestBlock}`,
    type: "block_observation",
    category: "block",
    description: `Watching Base block ${latestBlock}`,
    observed_at: new Date().toISOString(),
    confidence: "low",
    source: "base_rpc"
  };
}

// =======================
// MAIN HANDLER
// =======================

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const address = searchParams.get("address")?.toLowerCase() || null;

    const latestBlock = await provider.getBlockNumber();

    const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);

    const blocks = await getBlocksWithTx(fromBlock, latestBlock);
    // blocks = await hydrateTransactions(blocks); // not needed with getBlock(..., true)

    const signals = [];

    if (address) {
      signals.push(...buildWalletOverview(address, blocks));
    }

    const { signals: tokenSignals, tokenCounts } =
      buildActiveTokenSignals(blocks);

    signals.push(...tokenSignals);
    signals.push(...await buildWhaleSignals(blocks));
    signals.push(...buildDexSwapSignals(blocks));
    signals.push(...buildNewContractSignals(blocks));
    signals.push(...buildLiquidityMigrationSignals(blocks));
    signals.push(...buildContractActivitySignals(blocks));
    signals.push(...detectERC20Deploys(blocks));
    signals.push(buildBlockObservation(latestBlock));

    const blockNumbers = blocks.map(b => b?.number).filter(Boolean);

    const smartWallets = signals
      .filter(s => s.type === "smart_money_wallet")
      .map(s => ({
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
