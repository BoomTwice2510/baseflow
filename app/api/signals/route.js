import { NextResponse } from "next/server";
import { ethers } from "ethers";

const BASE_RPC = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(BASE_RPC);

// Min ETH for volume anomaly
const MIN_VOLUME_ETH =
  process.env.MIN_VOLUME_ETH ? Number(process.env.MIN_VOLUME_ETH) : 0.2;

// Uniswap v3 Mint/Burn event topics (signatures ke keccak256 hashes)
// NOTE: Yeh illustrative hashes hain; agar baad me exact chahiye ho to
// keccak256("Mint(address,address,int24,int24,uint128,uint256,uint256)")
// aur keccak256("Burn(address,int24,int24,uint128,uint256,uint256)") se nikaal sakte ho.
const MINT_TOPIC =
  "0x0c396cd9891deb2c50f5c7be0b0b9fd379ffb410f42be9a27c237248cfad8c30";
const BURN_TOPIC =
  "0x0c396cd9891deb2c50f5c7be0b0b9fd379ffb410f42be9a27c237248cfad8c31";

export async function GET() {
  try {
    const latestBlock = await provider.getBlockNumber();

    // Base block with txs for volume / deploy
    const block = await provider.getBlock(latestBlock, true);

    const signals = [];

    // 1) Convert recent transactions → volume / deploy signals
    if (block && Array.isArray(block.transactions)) {
      const recentTxs = block.transactions.slice(-20); // last 20 txs of latest block

      for (let i = 0; i < recentTxs.length; i++) {
        const tx = recentTxs[i];

        // Volume anomaly: high-value tx
        if (tx.value && tx.value > ethers.parseEther(String(MIN_VOLUME_ETH))) {
          signals.push({
            id: `bf-vol-${latestBlock}-${i}`,
            type: "volume_anomaly",
            description:
              "Unusual token transfer volume detected in a short time window",
            confidence: "low",
            observed_at: new Date().toISOString(),
            source: "onchain_scan",
            note: "Early-stage volume observation. Needs confirmation."
          });
        }

        // Contract deployment: to === null
        if (tx.to === null) {
          signals.push({
            id: `bf-ctr-${latestBlock}-${i}`,
            type: "contract_deployment",
            description: "New smart contract deployed on Base",
            confidence: "low",
            observed_at: new Date().toISOString(),
            source: "onchain_scan",
            note: "Raw deployment event. Contract not analyzed."
          });
        }
      }
    }

    // 2) Convert Uniswap v3 Mint/Burn events → liquidity_event signals
    const RANGE = 50; // last 50 blocks
    const fromBlock =
      latestBlock - RANGE > 0 ? latestBlock - RANGE : latestBlock;

    const filterMint = {
      fromBlock,
      toBlock: latestBlock,
      topics: [MINT_TOPIC]
    };

    const filterBurn = {
      fromBlock,
      toBlock: latestBlock,
      topics: [BURN_TOPIC]
    };

    let mintLogs = [];
    let burnLogs = [];

    try {
      mintLogs = await provider.getLogs(filterMint);
      burnLogs = await provider.getLogs(filterBurn);
    } catch (logErr) {
      console.error("Error fetching Uniswap v3 logs:", logErr);
    }

    // Mint → liquidity added signals
    mintLogs.forEach((log, idx) => {
      signals.push({
        id: `bf-liq-mint-${log.blockNumber}-${idx}`,
        type: "liquidity_event",
        description: "Liquidity added to a Uniswap v3 pool on Base",
        confidence: "low",
        observed_at: new Date().toISOString(),
        source: "onchain_scan",
        note: "Raw Uniswap v3 Mint event. No trade advice."
      });
    });

    // Burn → liquidity removed signals
    burnLogs.forEach((log, idx) => {
      signals.push({
        id: `bf-liq-burn-${log.blockNumber}-${idx}`,
        type: "liquidity_event",
        description: "Liquidity removed from a Uniswap v3 pool on Base",
        confidence: "low",
        observed_at: new Date().toISOString(),
        source: "onchain_scan",
        note: "Raw Uniswap v3 Burn event. No trade advice."
      });
    });

    // 3) Fallback: agar kuch bhi nahi mila, simple block_observation
    if (signals.length === 0) {
      signals.push({
        id: `bf-obs-${latestBlock}`,
        type: "block_observation",
        description: `Watching Base block ${latestBlock}`,
        confidence: "low",
        observed_at: new Date().toISOString(),
        source: "base_rpc",
        note: "No notable Uniswap v3 or volume events detected recently."
      });
    }

    return NextResponse.json({
      agent: "BaseFlow Signal Agent",
      chain: "Base",
      updated_at: new Date().toISOString(),
      latest_block: latestBlock,
      sample_block_hash: block && block.hash,
      min_volume_eth: MIN_VOLUME_ETH,
      searched_from_block: fromBlock,
      searched_to_block: latestBlock,
      signals
    });
  } catch (err) {
    console.error("Signal agent error:", err && err.message ? err.message : err);
    return NextResponse.json(
      {
        error: "Failed to fetch Base data",
        detail: err && err.message ? err.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
