import { provider } from "./baseRpc.js";
import { ethers } from "ethers";

const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

const ABI = [
  "event PoolCreated(address indexed token0,address indexed token1,uint24 fee,int24 tickSpacing,address pool)"
];

const contract = new ethers.Contract(FACTORY, ABI, provider);

let lastBlock = null;

export async function scanUniswapPools() {
  try {
    const latest = await provider.getBlockNumber();

    if (!lastBlock) {
      // first run: small window to avoid missing recent pools
      lastBlock = latest - 20;
      if (lastBlock < 0) lastBlock = 0;
    }

    const filter = contract.filters.PoolCreated();

    const events = await contract.queryFilter(
      filter,
      lastBlock,
      latest
    );

    const signals = [];

    for (const e of events) {
      if (!e.args) continue;

      const block = await e.getBlock?.().catch(() => null);
      const observed_at = block
        ? new Date(block.timestamp * 1000).toISOString()
        : null;

      signals.push({
        type: "uniswap_pool_created",
        token0: e.args.token0.toLowerCase(),
        token1: e.args.token1.toLowerCase(),
        pool: e.args.pool.toLowerCase(),
        observed_at,
        source: "rpc_uniswap_pool"
      });
    }

    lastBlock = latest;

    return signals;
  } catch (err) {
    console.error("Uniswap scan error:", err.message);
    return [];
  }
}
