// app/api/signals/route.js

import {
  getWhaleSignals,
  getVolumeSignals,
  getSmartMoneySignals,
  getMultiWhaleSignals,
  getHolderSpikeSignals,
} from "../../../services/dune.js";

import { scoreSignal } from "../../../engine/signalScore.js";
import { applySignalCorrelation } from "../../../engine/correlationEngine.js";

import {
  getCache,
  setCache,
  isExpired,
} from "../../../utils/cache.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // ============ CACHE ============
    const cached = getCache("signals");
    if (cached && !isExpired("signals")) {
      return Response.json(cached, {
        headers: {
          "Cache-Control": "s-maxage=15, stale-while-revalidate",
        },
      });
    }

    // ============ CONFIG ============
    const MAX_WHALE = parseInt(process.env.MAX_WHALE_SIGNALS || "5");
    const MAX_VOLUME = parseInt(process.env.MAX_VOLUME_SIGNALS || "5");
    const MAX_SMART = parseInt(process.env.MAX_SMART_SIGNALS || "5");
    const MAX_MULTI = parseInt(process.env.MAX_MULTI_SIGNALS || "5");
    const MAX_HOLDER_SPIKE = parseInt(
      process.env.MAX_HOLDER_SPIKE || "5"
    );
    const MAX_FINAL = parseInt(process.env.MAX_FINAL_SIGNALS || "15");

    const VOLUME_THRESHOLD = parseFloat(
      process.env.VOLUME_THRESHOLD || "150000"
    );
    const HOLDER_SPIKE_THRESHOLD = parseInt(
      process.env.HOLDER_SPIKE_THRESHOLD || "120"
    );

    // ============ QUERY PARAMS ============
    const { searchParams } = new URL(request.url);
    const types =
      searchParams.get("types")?.split(",").map((t) => t.trim()) || [];
    const limit = Math.min(
      parseInt(searchParams.get("limit") || MAX_FINAL),
      MAX_FINAL
    );
    const debugMode = searchParams.get("debug") === "1";

    // ============ FETCH (ONLY DUNE) ============
    let whaleSignals = [];
    let volumeSignals = [];
    let smartMoneySignals = [];
    let multiWhaleSignals = [];
    let holderSpikeSignals = [];

    const fetches = [
      getWhaleSignals().catch(() => []),
      getVolumeSignals().catch(() => []),
      getSmartMoneySignals().catch(() => []),
      getMultiWhaleSignals().catch(() => []),
      getHolderSpikeSignals().catch(() => []),
    ];

    [
      whaleSignals,
      volumeSignals,
      smartMoneySignals,
      multiWhaleSignals,
      holderSpikeSignals,
    ] = await Promise.all(fetches);

    // ============ WHALE FILTER ============

    const whaleBlacklist = [
      "0x4200000000000000000000000000000000000010",
      "0x4200000000000000000000000000000000000006",
    ].map((a) => a.toLowerCase());

    const seenWallets = new Set();
    const seenTx = new Set();

    const whaleFiltered = (whaleSignals || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.observed_at || 0).getTime() -
          new Date(a.observed_at || 0).getTime()
      )
      .filter((w) => {
        const wallet = String(w.wallet_from || w.wallet).toLowerCase();
        const to = String(w.wallet_to || "").toLowerCase();
        const tx = w.tx_hash || w.tx;

        if (!wallet || !tx) return false;
        if (whaleBlacklist.includes(wallet)) return false;
        if (wallet === to) return false;
        if (to.startsWith("0x000000")) return false;
        if (seenTx.has(tx)) return false;
        seenTx.add(tx);
        if (seenWallets.has(wallet)) return false;
        seenWallets.add(wallet);

        return true;
      })
      .slice(0, MAX_WHALE);

    // ============ VOLUME FILTER ============

    const volumeFiltered = (volumeSignals || [])
      .filter((v) => {
        const vol =
          Number(v.cluster_volume || 0) ||
          Number(v.meta?.cluster_volume || 0) ||
          Number(v.usd_value || 0);
        return vol > VOLUME_THRESHOLD;
      })
      .slice(0, MAX_VOLUME);

    // ============ HOLDER FILTER ============

    const holderFiltered = (holderSpikeSignals || [])
      .filter(
        (h) =>
          Number(h.holders_1h || h.meta?.holders_1h || 0) >
          HOLDER_SPIKE_THRESHOLD
      )
      .filter(
        (h) =>
          Number(h.holders_1h || h.meta?.holders_1h || 0) < 2000
      )
      .slice(0, MAX_HOLDER_SPIKE);

    // ============ MERGE RAW SIGNALS ============

    let signals = [
      ...whaleFiltered,
      ...(smartMoneySignals || []).slice(0, MAX_SMART),
      ...(multiWhaleSignals || []).slice(0, MAX_MULTI),
      ...volumeFiltered,
      ...holderFiltered,
    ];

    // ============ DEDUPE ============

    const seen = new Set();
    signals = signals.filter((s) => {
      const key =
        s.tx_hash ||
        s.tx ||
        s.contract ||
        s.token ||
        `${s.type}-${s.token || s.contract}-${s.observed_at}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ============ SCORE + CORRELATION ============

    signals = signals.map((s) => ({
      ...s,
      score: scoreSignal(s || {}),
    }));

    signals = applySignalCorrelation(signals);

    // ============ SORT BY SCORE ============

    signals = signals
      .sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (
          new Date(b.observed_at || 0) -
          new Date(a.observed_at || 0)
        );
      })
      .slice(0, limit);

    // ============ ENSURE TYPE DIVERSITY ============

    const ensureType = (type, pool, count = 1) => {
      if (!pool || pool.length === 0) return;
      const already = signals.filter((s) => s.type === type);
      if (already.length >= count) return;

      const extra = pool.filter(
        (s) =>
          s.type === type &&
          !signals.some(
            (x) => (x.tx_hash || x.tx) === (s.tx_hash || s.tx)
          )
      );
      if (extra.length > 0) {
        signals = [...signals, ...extra.slice(0, count)];
      }
    };

    ensureType("whale_tx", whaleFiltered, 1);
    ensureType("smart_money_buy", smartMoneySignals, 1);
    ensureType("volume_spike", volumeFiltered, 1);
    ensureType("holder_spike", holderFiltered, 1);

    // re-sort + trim
    signals = signals
      .sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (
          new Date(b.observed_at || 0) -
          new Date(a.observed_at || 0)
        );
      })
      .slice(0, limit);

    // ============ AGE FILTER ============

    const nowTs = Date.now();
    const HOLDER_MAX = 2 * 60 * 60 * 1000;
    const WHALE_MAX = 1 * 60 * 60 * 1000;
    const DEFAULT_MAX = 6 * 60 * 60 * 1000;

    signals = signals.filter((s) => {
      if (!s.observed_at) return false;
      const age = nowTs - new Date(s.observed_at).getTime();
      if (s.type === "holder_spike") return age <= HOLDER_MAX;
      if (s.type === "whale_tx") return age <= WHALE_MAX;
      return age <= DEFAULT_MAX;
    });

    // ============ TYPE FILTER (QUERY) ============

    if (types.length > 0) {
      signals = signals.filter((s) => types.includes(s.type));
    }

    // ============ META ============

    const meta = {
      sources: {
        whale: (whaleSignals || []).length > 0,
        volume: (volumeSignals || []).length > 0,
        smart_money: (smartMoneySignals || []).length > 0,
        multi_whale: (multiWhaleSignals || []).length > 0,
        holder_spike: (holderSpikeSignals || []).length > 0,
      },
      total_raw:
        (whaleSignals || []).length +
        (volumeSignals || []).length +
        (smartMoneySignals || []).length +
        (multiWhaleSignals || []).length +
        (holderSpikeSignals || []).length,
      filtered_count: signals.length,
      timestamp: new Date().toISOString(),
    };

    if (debugMode || process.env.DEBUG === "true") {
      console.log("SIGNAL DEBUG:", {
        whaleSignals: (whaleSignals || []).length,
        volumeSignals: (volumeSignals || []).length,
        smartMoneySignals: (smartMoneySignals || []).length,
        multiWhaleSignals: (multiWhaleSignals || []).length,
        holderSpikeSignals: (holderSpikeSignals || []).length,
        finalSignals: signals.length,
        finalTypes: signals.map((s) => s.type),
      });
    }

    const response = {
      agent: "baseflow",
      network: "base",
      timestamp: Date.now(),
      signals,
      meta,
    };

    setCache("signals", response);

    return Response.json(response, {
      headers: {
        "Cache-Control": "s-maxage=15, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Signal API error:", error);
    return Response.json(
      { error: "signal_generation_failed" },
      { status: 500 }
    );
  }
}
