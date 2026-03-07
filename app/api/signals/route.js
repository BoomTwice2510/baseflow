import { getGasPrice } from "../../../services/baseRpc.js"
import { getNewPools } from "../../../services/uniswap.js"
import { scanBaseBlocks } from "../../../services/rpcScanner.js"
import { scanUniswapPools } from "../../../services/uniswapScanner.js"

import {
  getWhaleSignals,
  getDeploySignals,
  getVolumeSignals,
  getSmartMoneySignals,
  getMultiWhaleSignals,
  getHolderSpikeSignals
} from "../../../services/dune.js"

import { buildSignals } from "../../../engine/signalEngine.js"
import { scoreSignal } from "../../../engine/signalScore.js"
import { applySignalCorrelation } from "../../../engine/correlationEngine.js"

import {
  getCache,
  setCache,
  isExpired
} from "../../../utils/cache.js"

export const dynamic = "force-dynamic"

export async function GET(request) {

  try {

    // ================= CACHE =================
    const cached = getCache()

    if (cached && !isExpired()) {
      return Response.json(cached)
    }

    // ================= CONFIG =================
    const MAX_WHALE = parseInt(process.env.MAX_WHALE_SIGNALS || "5")
    const MAX_DEPLOY = parseInt(process.env.MAX_DEPLOY_SIGNALS || "5")
    const MAX_VOLUME = parseInt(process.env.MAX_VOLUME_SIGNALS || "5")
    const MAX_RPC = parseInt(process.env.MAX_RPC_SIGNALS || "5")
    const MAX_POOLS = parseInt(process.env.MAX_POOL_SIGNALS || "5")
    const MAX_FINAL = parseInt(process.env.MAX_FINAL_SIGNALS || "25")

    const VOLUME_THRESHOLD =
      parseFloat(process.env.VOLUME_THRESHOLD || "100000")

    const deployBlacklist = [
      "0x777777751622c0d3258f214f9df38e35bf45baf3"
    ]

    // ================= QUERY PARAMS =================
    const { searchParams } = new URL(request.url)

    const types =
      searchParams.get("types")?.split(",").map(t => t.trim()) || []

    const limit =
      parseInt(searchParams.get("limit") || MAX_FINAL.toString())

    // ================= FETCH =================
    let gas = {}
    let pools = []
    let rpcSignals = []
    let whaleSignals = []
    let deploySignals = []
    let volumeSignals = []
    let poolSignals = []
    let smartMoneySignals = []
    let multiWhaleSignals = []
    let holderSpikeSignals = []

    const fetches = [

      getGasPrice().catch(() => ({})),

      getNewPools().catch(() => []),

      scanBaseBlocks().catch(() => []),

      getWhaleSignals().catch(() => []),

      getDeploySignals().catch(() => []),

      getVolumeSignals().catch(() => []),

      scanUniswapPools().catch(() => []),

      getSmartMoneySignals().catch(() => []),

      getMultiWhaleSignals().catch(() => []),

      getHolderSpikeSignals().catch(() => [])

    ]

    ;[
      gas,
      pools,
      rpcSignals,
      whaleSignals,
      deploySignals,
      volumeSignals,
      poolSignals,
      smartMoneySignals,
      multiWhaleSignals,
      holderSpikeSignals
    ] = await Promise.all(fetches)

    // ================= WHALE FILTER =================
const whaleBlacklist = [
 "0x4200000000000000000000000000000000000010",
 "0x4200000000000000000000000000000000000006"
]

const seenWallets = new Set()

const whaleFiltered =
  whaleSignals
    .sort((a,b) => (b.amount || 0) - (a.amount || 0))
    .filter(w => {

      if (!w.wallet) return false

      const wallet = String(w.wallet).toLowerCase()

      if (whaleBlacklist.includes(wallet)) return false

      if (seenWallets.has(wallet)) return false

      seenWallets.add(wallet)

      return true

    })
    .slice(0, MAX_WHALE)

    // ================= DEPLOY FILTER =================
    const deployFiltered =
      deploySignals
        .filter(d =>
          !deployBlacklist.includes(
            d.creator?.toLowerCase()
          )
        )
        .slice(0, MAX_DEPLOY)

    // ================= VOLUME FILTER (BUG FIXED) =================
    const volumeFiltered =
      volumeSignals
        .filter(v => v.amount > VOLUME_THRESHOLD)
        .slice(0, MAX_VOLUME)

    // ================= POOL FILTER =================
    const poolFiltered =
      poolSignals.slice(0, MAX_POOLS)

    // ================= MERGE =================
    let signals = [

      ...rpcSignals.slice(0, MAX_RPC),

      ...whaleFiltered,

      ...deployFiltered,

      ...volumeFiltered,

      ...poolFiltered,

      ...smartMoneySignals,

      ...multiWhaleSignals,

      ...holderSpikeSignals

    ]

    // ================= REMOVE DUPLICATES =================
    const seen = new Set()

    signals = signals.filter(s => {

      const key =
  s.tx ||
  s.contract ||
  s.token ||
  s.pool ||
  JSON.stringify(s)

      if (seen.has(key)) return false

      seen.add(key)

      return true

    })

    // ===== SCORE =====

    signals = signals.map(s => ({
      ...s,
      score: scoreSignal(s)
    }))

    signals = applySignalCorrelation(signals)

    // ===== SORT BY SCORE =====

   signals = signals
  .sort((a, b) => b.score - a.score)
  .slice(0, limit)

    // ================= DEBUG =================
    if(process.env.DEBUG === "true"){

 console.log("SIGNAL DEBUG:",{
  rpcSignals: rpcSignals.length,
  whaleSignals: whaleSignals.length,
  deploySignals: deploySignals.length,
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
        types.includes(
          s.category || s.type || "unknown"
        )
      )

    }

    // ================= META =================
    const meta = {

      sources: {

        rpc: rpcSignals.length > 0,

        whale: whaleSignals.length > 0,

        deploy: deploySignals.length > 0,

        volume: volumeSignals.length > 0,

        pools: poolSignals.length > 0,

        smart_money: smartMoneySignals.length > 0,

        multi_whale: multiWhaleSignals.length > 0,

        holder_spike: holderSpikeSignals.length > 0

      },

      total_raw:
        rpcSignals.length +
        whaleSignals.length +
        deploySignals.length +
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
    setCache(response)

    return Response.json(response)

  }

  catch (error) {

    console.error("Signal API error:", error)

    return Response.json(
      { error: "signal_generation_failed" },
      { status: 500 }
    )

  }

}