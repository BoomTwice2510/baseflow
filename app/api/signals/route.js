import { getDexPairs } from "../../../services/dexscreener.js"
import { getGasPrice } from "../../../services/baseRpc.js"
import { getNewPools } from "../../../services/uniswap.js"
import { scanBaseBlocks } from "../../../services/rpcScanner.js"

import {
  getWhaleSignals,
  getDeploySignals,
  getVolumeSignals
} from "../../../services/dune.js"

import { buildSignals } from "../../../engine/signalEngine.js"

export async function GET(request) {
  try {
    // ================= CONFIGS =================
    const MAX_WHALE = parseInt(process.env.MAX_WHALE_SIGNALS || '5');
    const MAX_DEPLOY = parseInt(process.env.MAX_DEPLOY_SIGNALS || '5');
    const MAX_VOLUME = parseInt(process.env.MAX_VOLUME_SIGNALS || '5');
    const MAX_RPC = parseInt(process.env.MAX_RPC_SIGNALS || '5');
    const MAX_FINAL = parseInt(process.env.MAX_FINAL_SIGNALS || '20');
    const VOLUME_THRESHOLD = parseFloat(process.env.VOLUME_THRESHOLD || '100000');

    const deployBlacklist = [
      "0x777777751622c0d3258f214f9df38e35bf45baf3"
    ];

    // Query params for filtering
    const { searchParams } = new URL(request.url);
    const types = searchParams.get('types')?.split(',').map(t => t.trim()) || [];
    const limit = parseInt(searchParams.get('limit') || MAX_FINAL.toString());

    // ================= PARALLEL FETCHES WITH FALLBACKS =================
    let pairs = [], gas = {}, pools = [], rpcSignals = [], whaleSignals = [], deploySignals = [], volumeSignals = [];
    
    const fetches = [
      getDexPairs().catch(e => { console.warn("DexPairs failed:", e.message); return []; }),
      getGasPrice().catch(e => { console.warn("Gas failed:", e.message); return {}; }),
      getNewPools().catch(e => { console.warn("NewPools failed:", e.message); return []; }),
      scanBaseBlocks().catch(e => { console.warn("scanBaseBlocks failed:", e.message); return []; }),
      getWhaleSignals().catch(e => { console.warn("WhaleSignals failed:", e.message); return []; }),
      getDeploySignals().catch(e => { console.warn("DeploySignals failed:", e.message); return []; }),
      getVolumeSignals().catch(e => { console.warn("VolumeSignals failed:", e.message); return []; }),
    ];

    [pairs, gas, pools, rpcSignals, whaleSignals, deploySignals, volumeSignals] = await Promise.all(fetches);

    // ================= CORE LOGIC (UNCHANGED) =================
    const dexSignals = buildSignals({
      pairs,
      gas,
      pools
    });

    // -------- WHALE FILTER --------
    const seenWallets = new Set();
    const whaleFiltered = whaleSignals
      .filter(w => {
        if (seenWallets.has(w.wallet)) return false;
        seenWallets.add(w.wallet);
        return true;
      })
      .slice(0, MAX_WHALE);

    // -------- DEPLOY FILTER --------
    const deployFiltered = deploySignals
      .filter(d => !deployBlacklist.includes(d.creator?.toLowerCase()))
      .slice(0, MAX_DEPLOY);

    // -------- VOLUME FILTER --------
    const volumeFiltered = volumeSignals
      .filter(v => v.amount > VOLUME_THRESHOLD)
      .slice(0, MAX_VOLUME);

    // ================= FINAL SIGNALS =================
    let signals = [
      ...dexSignals,
      ...rpcSignals.slice(0, MAX_RPC),
      ...whaleFiltered,
      ...deployFiltered,
      ...volumeFiltered
    ].slice(0, limit);

    // Type-based filtering if requested
    if (types.length > 0) {
      signals = signals.filter(s => 
        types.includes(s.category || s.type || 'unknown')
      );
    }

    // ================= HEALTH METRICS =================
    const meta = {
      sources: {
        dex: dexSignals.length > 0,
        rpc: rpcSignals.length > 0,
        whale: whaleSignals.length > 0,
        deploy: deploySignals.length > 0,
        volume: volumeSignals.length > 0
      },
      total_raw: dexSignals.length + rpcSignals.length + whaleSignals.length + deploySignals.length + volumeSignals.length,
      filtered_count: signals.length,
      timestamp: new Date().toISOString()
    };

    return Response.json({
      agent: "baseflow",
      network: "base",
      timestamp: Date.now(),
      signals,
      meta
    });

  } catch (error) {
    console.error("Signal API error:", error);
    return Response.json(
      { error: "signal_generation_failed" },
      { status: 500 }
    );
  }
}
