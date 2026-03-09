// app/api/signal/route.js

import {
  getWhaleSignals,
  getVolumeSignals,
  getSmartMoneySignals,
  getMultiWhaleSignals,
  getHolderSpikeSignals,
} from "../../../services/dune.js";

import { scoreSignal } from "../../../engine/signalScore.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    const [
      whaleSignals,
      volumeSignals,
      smartMoneySignals,
      multiWhaleSignals,
      holderSpikeSignals,
    ] = await Promise.all([
      getWhaleSignals().catch(() => []),
      getVolumeSignals().catch(() => []),
      getSmartMoneySignals().catch(() => []),
      getMultiWhaleSignals().catch(() => []),
      getHolderSpikeSignals().catch(() => []),
    ]);

    const scoreList = (arr = []) =>
      arr
        .map((s) => ({ ...s, score: scoreSignal(s || {}) }))
        // newest first
        .sort(
          (a, b) =>
            new Date(b.observed_at || 0).getTime() -
            new Date(a.observed_at || 0).getTime()
        )
        .slice(0, limit);

    const whales = scoreList(whaleSignals);
    const volume = scoreList(volumeSignals);
    const smart = scoreList(smartMoneySignals);
    const multi = scoreList(multiWhaleSignals);
    const holders = scoreList(holderSpikeSignals);

    const response = {
      agent: "baseflow",
      network: "base",
      timestamp: Date.now(),
      groups: {
        whales,
        holders,
        volume,
        smart,
        multi,
      },
      meta: {
        counts: {
          whales: whaleSignals.length,
          holders: holderSpikeSignals.length,
          volume: volumeSignals.length,
          smart: smartMoneySignals.length,
          multi: multiWhaleSignals.length,
        },
        limit,
        timestamp: new Date().toISOString(),
      },
    };

    return Response.json(response, {
      headers: {
        "Cache-Control": "s-maxage=15, stale-while-revalidate",
      },
    });
  } catch (err) {
    console.error("signal API error:", err);
    return Response.json(
      { error: "signal_failed" },
      { status: 500 }
    );
  }
}
