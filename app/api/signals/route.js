import { getGasPrice } from "../../../services/baseRpc.js"
import { getNewPools } from "../../../services/uniswap.js"
import { scanBaseBlocks } from "../../../services/rpcScanner.js"
import { scanUniswapPools } from "../../../services/uniswapScanner.js"

import {
  getWhaleSignals,
  getVolumeSignals,
  getSmartMoneySignals,
  getMultiWhaleSignals,
  getHolderSpikeSignals
} from "../../../services/dune.js"

import { scoreSignal } from "../../../engine/signalScore.js"
import { applySignalCorrelation } from "../../../engine/correlationEngine.js"

import {
  getCache,
  setCache,
  isExpired,
  clearCache
} from "../../../utils/cache.js"

export const dynamic = "force-dynamic"

export async function GET(request) {
 // clearCache("signals")
  try {

    // ================= CACHE =================
    const cached = getCache("signals")

    if (cached && !isExpired("signals")) {
    return Response.json(cached)
}

    // ================= CONFIG =================
    const MAX_WHALE = parseInt(process.env.MAX_WHALE_SIGNALS || "5")
    const MAX_VOLUME = parseInt(process.env.MAX_VOLUME_SIGNALS || "5")
    const MAX_RPC = parseInt(process.env.MAX_RPC_SIGNALS || "2")
    const MAX_POOLS = parseInt(process.env.MAX_POOL_SIGNALS || "5")
    const MAX_SMART = parseInt(process.env.MAX_SMART_SIGNALS || "5")
    const MAX_HOLDER_SPIKE = parseInt(process.env.MAX_HOLDER_SPIKE || "5")
    const HOLDER_SPIKE_THRESHOLD = parseInt(process.env.HOLDER_SPIKE_THRESHOLD || "150")
    const MAX_FINAL = parseInt(process.env.MAX_FINAL_SIGNALS || "15")

    const VOLUME_THRESHOLD =
      parseFloat(process.env.VOLUME_THRESHOLD || "100000")

    const deployBlacklist = [
      "0x777777751622c0d3258f214f9df38e35bf45baf3"
    ]

    // ================= QUERY PARAMS =================
    const { searchParams } = new URL(request.url)

    const types =
      searchParams.get("types")?.split(",").map(t => t.trim()) || []

    const limit = Math.min(
     parseInt(searchParams.get("limit") || MAX_FINAL),
    MAX_FINAL
    )

    // ================= FETCH =================
    let gas = {}
    let pools = []
    let rpcSignals = []
    let whaleSignals = []
    let volumeSignals = []
    let poolSignals = []
    let smartMoneySignals = []
    let multiWhaleSignals = []
    let holderSpikeSignals = []

    const fetches = [

      getGasPrice().catch(()=>({})),

      getNewPools().catch(() => []),

      scanBaseBlocks().catch(() => []),

      getWhaleSignals().catch(() => []),

      getVolumeSignals().catch(() => []),

      scanUniswapPools().catch(() => []),

      getSmartMoneySignals().catch(() => []),

      getMultiWhaleSignals().catch(() => []),

      getHolderSpikeSignals().catch(() => []),


    ]

    ;[
      gas,
      pools,
      rpcSignals,
      whaleSignals,
      volumeSignals,
      poolSignals,
      smartMoneySignals,
      multiWhaleSignals,
      holderSpikeSignals,

    ] = await Promise.all(fetches)

    // ================= WHALE FILTER =================
      const whaleBlacklist = [
      "0x4200000000000000000000000000000000000010",
      "0x4200000000000000000000000000000000000006"
    ]

      const seenWallets = new Set()
      const seenTx = new Set()

      const whaleFiltered =
      whaleSignals
      .sort((a,b) => (b.amount || 0) - (a.amount || 0))
      .filter(w => {

      if (!w.wallet) return false
      if (!w.tx) return false

      const wallet = String(w.wallet).toLowerCase()
      const to = String(w.to || "").toLowerCase()

      // blacklist
      if (whaleBlacklist.includes(wallet)) return false

      // self transfer
      if (wallet === to) return false

      // remove contract/router spam
      if (to.startsWith("0x000000")) return false

      // remove duplicate tx
      if (seenTx.has(w.tx)) return false
      seenTx.add(w.tx)

      // remove wallet spam
      if (seenWallets.has(wallet)) return false
      seenWallets.add(wallet)

      return true

    })
    .slice(0, MAX_WHALE)

      // ================= VOLUME FILTER (BUG FIXED) =================
      const volumeFiltered =
      volumeSignals
        .filter(v => (v.volume || v.amount || 0) > VOLUME_THRESHOLD)
        .slice(0, MAX_VOLUME)

       // ================= POOL FILTER =================
        const poolFiltered =
       poolSignals.slice(0, MAX_POOLS)

      // ================= MERGE =================

        let signals = [

        ...poolFiltered,

        ...whaleFiltered,

        ...smartMoneySignals.slice(0, MAX_SMART),

        ...multiWhaleSignals.slice(0, MAX_SMART),

        ...volumeFiltered,

        ...rpcSignals.slice(0, MAX_RPC),

        ...holderSpikeSignals
        .filter(h => h.holders_1h > HOLDER_SPIKE_THRESHOLD)
        .filter(h => h.holders_1h < 2000)
        .filter(h => h.growth > 30)
        .sort((a,b) => (b.holders_1h || 0) - (a.holders_1h || 0))
        .slice(0, MAX_HOLDER_SPIKE)

      ]

    // ================= REMOVE DUPLICATES =================
    const seen = new Set()

    signals = signals.filter(s => {

      const key =
    s.tx ||
    s.contract ||
    s.token ||
    s.pool ||
    `${s.type}-${s.token || s.contract}-${s.observed_at}`

      if (seen.has(key)) return false

      seen.add(key)

      return true

    })

    // ===== SCORE =====

    signals = signals.map(s => ({
      ...s,
      score: scoreSignal(s || {})
    }))

    signals = applySignalCorrelation(signals)

    // ===== SORT BY SCORE =====

    signals = signals
    .sort((a,b) => {

    const scoreDiff = (b.score || 0) - (a.score || 0)
    if (scoreDiff !== 0) return scoreDiff

    return new Date(b.observed_at || 0) - new Date(a.observed_at || 0)

   })
    .slice(0, limit)

   // ===== AGE FILTER: window per type =====
    const nowTs = Date.now();
    const HOLDER_MAX = 2 * 60 * 60 * 1000;   // 2 hours
    const WHALE_MAX  = 24 * 60 * 60 * 1000;  // 24 hours
    const DEFAULT_MAX = 6 * 60 * 60 * 1000;  // 6 hours

    signals = signals.filter((s) => {
    if (!s.observed_at) return false;
    const age = nowTs - new Date(s.observed_at).getTime();

    if (s.type === "holder_spike") return age <= HOLDER_MAX;
    if (s.type === "whale_tx") return age <= WHALE_MAX;

   // volume_spike, smart_money_buy, multi_whale, etc.
    return age <= DEFAULT_MAX;
    });

    // ================= DEBUG =================
    if(process.env.DEBUG === "true"){

  console.log("SIGNAL DEBUG:",{
  rpcSignals: rpcSignals.length,
  whaleSignals: whaleSignals.length,
  volumeSignals: volumeSignals.length,
  poolSignals: poolSignals.length,
  smartMoneySignals: smartMoneySignals.length,
  multiWhaleSignals: multiWhaleSignals.length,
  holderSpikeSignals: holderSpikeSignals.length
 })

}

    // ================= TYPE FILTER =================
    if (types.length > 0) {

      signals = signals.filter(s =>
        types.includes(s.type)
      )

    }

    // ================= META =================
    const meta = {

      sources: {

        rpc: rpcSignals.length > 0,

        whale: whaleSignals.length > 0,

        volume: volumeSignals.length > 0,

        pools: poolSignals.length > 0,

        smart_money: smartMoneySignals.length > 0,

        multi_whale: multiWhaleSignals.length > 0,

        holder_spike: holderSpikeSignals.length > 0

      },

      total_raw:
        rpcSignals.length +
        whaleSignals.length +
        volumeSignals.length +
        poolSignals.length +
        smartMoneySignals.length +
        multiWhaleSignals.length +
        holderSpikeSignals.length,

      filtered_count: signals.length,

      timestamp: new Date().toISOString()

    }

    const response = {

      agent: "baseflow",

      network: "base",

      timestamp: Date.now(),

      signals,

      meta

    }

    // ================= CACHE SAVE =================
    setCache("signals", response)

    return Response.json(response, {
    headers: { 
    'Cache-Control': 's-maxage=15, stale-while-revalidate' 
  }
})

  }

  catch (error) {

    console.error("Signal API error:", error)

    return Response.json(
      { error: "signal_generation_failed" },
      { status: 500 }
    )

  }

}