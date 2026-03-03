import { NextResponse } from "next/server";
import { ethers } from "ethers";

const BASE_RPC =
  process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(BASE_RPC);

// Min ETH for volume anomaly (real txs only)
const MIN_VOLUME_ETH =
  process.env.MIN_VOLUME_ETH ? Number(process.env.MIN_VOLUME_ETH) : 0.05;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const watchAddress = searchParams.get("address") || null;

    const latestBlock = await provider.getBlockNumber();
    const block = await provider.getBlock(latestBlock, true);

    const signals = [];
    const nowIso = new Date().toISOString();

    // ---------- Real onchain tx → signals (no Uniswap heuristics) ----------
    if (block && Array.isArray(block.transactions)) {
      const recentTxs = block.transactions; // full block

      for (let i = 0; i < recentTxs.length; i++) {
        const tx = recentTxs[i];

        // 1) Volume anomaly: high-value native transfer
        if (tx.value && tx.value > ethers.parseEther(String(MIN_VOLUME_ETH))) {
          signals.push({
            id: `bf-vol-${latestBlock}-${i}`,
            type: "volume_anomaly",
            description:
              "Unusual native token transfer volume detected in the latest block.",
            confidence: "low",
            observed_at: nowIso,
            source: "onchain_scan",
            note:
              "Real onchain transfer above configured volume threshold. No trade advice.",
            meta: {
              from: tx.from,
              to: tx.to,
              value_eth: Number(ethers.formatEther(tx.value)),
              tx_hash: tx.hash,
              explorer_url: `https://basescan.org/tx/${tx.hash}`
            }
          });
        }

        // 2) Contract deployment
        if (tx.to === null) {
          signals.push({
            id: `bf-ctr-${latestBlock}-${i}`,
            type: "contract_deployment",
            description: "New contract deployment detected in the latest block.",
            confidence: "low",
            observed_at: nowIso,
            source: "onchain_scan",
            note: "Real deployment event from a Base transaction. Code not analyzed.",
            meta: {
              from: tx.from,
              tx_hash: tx.hash,
              explorer_url: `https://basescan.org/tx/${tx.hash}`
            }
          });
        }

        // 3) Optional wallet‑specific activity
        if (watchAddress) {
          const addr = watchAddress.toLowerCase();
          const fromMatch = tx.from && tx.from.toLowerCase() === addr;
          const toMatch = tx.to && tx.to.toLowerCase() === addr;

          if (fromMatch || toMatch) {
            signals.push({
              id: `bf-wallet-${latestBlock}-${i}`,
              type: "wallet_activity",
              description: `Activity detected for watched address ${watchAddress} in the latest block.`,
              confidence: "medium",
              observed_at: nowIso,
              source: "address_watch",
              note: fromMatch
                ? "Outgoing transaction from watched wallet."
                : "Incoming transaction to watched wallet.",
              meta: {
                from: tx.from,
                to: tx.to,
                value_eth: tx.value
                  ? Number(ethers.formatEther(tx.value))
                  : 0,
                tx_hash: tx.hash,
                explorer_url: `https://basescan.org/tx/${tx.hash}`
              }
            });
          }
        }
      }
    }

    // ---------- Summary / fallback ----------
    const fromBlock = latestBlock; // only latest block scanned for now

    if (signals.length === 0) {
      signals.push({
        id: `bf-obs-${latestBlock}`,
        type: "block_observation",
        description: `Watching Base block ${latestBlock}.`,
        confidence: "low",
        observed_at: nowIso,
        source: "base_rpc",
        note:
          "No high-volume transfers, deployments, or watched wallet activity detected in this block.",
        meta: {
          searched_from_block: fromBlock,
          searched_to_block: latestBlock,
          min_volume_eth: MIN_VOLUME_ETH,
          watch_address: watchAddress
        }
      });
    } else {
      signals.unshift({
        id: `bf-summary-${latestBlock}`,
        type: "summary",
        description: `Summary of real onchain activity in Base block ${latestBlock}.`,
        confidence: "low",
        observed_at: nowIso,
        source: "onchain_scan",
        note:
          "All signals are derived from real Base transactions in the latest block. No synthetic data.",
        meta: {
          total_signals: signals.length,
          counts_by_type: signals.reduce((acc, s) => {
            acc[s.type] = (acc[s.type] || 0) + 1;
            return acc;
          }, {}),
          searched_from_block: fromBlock,
          searched_to_block: latestBlock,
          min_volume_eth: MIN_VOLUME_ETH,
          watch_address: watchAddress
        }
      });
    }

    return NextResponse.json({
      agent: "BaseFlow Signal Agent",
      chain: "Base",
      updated_at: nowIso,
      latest_block: latestBlock,
      sample_block_hash: block && block.hash,
      min_volume_eth: MIN_VOLUME_ETH,
      searched_from_block: fromBlock,
      searched_to_block: latestBlock,
      watch_address: watchAddress,
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
