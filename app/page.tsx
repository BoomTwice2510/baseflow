"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type Signal = {
  id: string;
  type: string;
  category?: string;
  description: string;
  confidence: string;
  observed_at: string;
  source: string;
  note?: string;
  meta?: any;
};

type TabKey = "all" | "liq" | "vol" | "deploy" | "block";

const TYPE_LABELS: Record<string, string> = {
  liquidity_event: "Liquidity",
  liquidity_migration: "Liquidity",
  volume_anomaly: "Volume",
  whale_transfer: "Whale",
  dex_swap: "DEX",
  contract_deployment: "Deploy",
  block_observation: "Block",
  wallet_overview: "Wallet"
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#64748b"
};

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [address, setAddress] = useState("");

  async function loadSignals(customAddress?: string) {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      const addr = (customAddress ?? address).trim();

      if (addr) params.set("address", addr);

      const url = "/api/signals" + (params.toString() ? `?${params}` : "");

      const res = await fetch(url);

      const json = await res.json();

      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const id = setInterval(() => {
      loadSignals();
    }, 15000);

    return () => clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  const signals: Signal[] = data?.signals || [];

  const sortedSignals = [...signals].sort(
    (a, b) =>
      new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  const filteredSignals = sortedSignals.filter((s) => {
    if (activeTab === "all") return true;

    const cat = s.category || "";

    if (activeTab === "liq") return cat === "liq";
    if (activeTab === "vol") return cat === "vol";
    if (activeTab === "deploy") return cat === "deploy";
    if (activeTab === "block") return cat === "block";

    return true;
  });

  const stats = {
    total: signals.length,
    whales: signals.filter((s) => s.type === "whale_transfer").length,
    deploys: signals.filter((s) => s.type === "contract_deployment").length,
    tokens: signals.filter((s) => s.type === "active_token").length
  };

  function copy(v: string) {
    navigator.clipboard.writeText(v);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui",
        background: "#020617",
        color: "#f9fafb",
        maxWidth: 480,
        marginInline: "auto"
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          {/* logo + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid rgba(148,163,184,.4)",
                background: "#020617",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src="/hero.png" // apna actual logo path
                alt="Base agent logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div style={{ fontSize: 18, fontWeight: 700 }}>
              BaseFlow Signal Agent
            </div>
          </div>

          {/* LIVE pill */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(34,197,94,.5)",
              background: autoRefresh ? "rgba(22,163,74,.15)" : "transparent",
              color: autoRefresh ? "#4ade80" : "#9ca3af",
              cursor: "pointer"
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "999px",
                backgroundColor: autoRefresh ? "#22c55e" : "#6b7280"
              }}
            />
            {autoRefresh ? "LIVE" : "PAUSED"}
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
          Chain: Base · Block <strong>{data?.latest_block ?? "…"}</strong>
        </div>

        {data?.erc8004 && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            Agent #{data.erc8004.agent_id}
            {" · "}
            <a
              href={data.erc8004.explorer_url}
              target="_blank"
              style={{ color: "#60a5fa" }}
            >
              8004scan
            </a>
          </div>
        )}
      </header>

      {/* LIVE BLOCKS + ACTIVE TOKENS PANELS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
          fontSize: 11
        }}
      >
        {/* LIVE BLOCK FEED */}
        <div
          style={{
            background:
              "radial-gradient(circle at top, #0b1120 0, #020617 55%, #020617 100%)",
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,.2)"
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Live Blocks</div>

          {data?.live_feed?.latest_blocks?.map((b: number) => (
            <div key={b}>#{b}</div>
          ))}
        </div>

        {/* ACTIVE TOKENS */}
        <div
          style={{
            background:
              "radial-gradient(circle at top, #0b1120 0, #020617 55%, #020617 100%)",
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,.2)"
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Active Tokens</div>

          {data?.top_tokens?.map((t: any) => (
            <div key={t.token}>
              {t.token.slice(0, 8)}... ({t.transfers})
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          fontSize: 11,
          flexWrap: "wrap"
        }}
      >
        {[
          { label: "Signals", value: stats.total },
          { label: "Whales", value: stats.whales },
          { label: "Deploys", value: stats.deploys },
          { label: "Tokens", value: stats.tokens }
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(15,23,42,.9)",
              border: "1px solid rgba(148,163,184,.3)"
            }}
          >
            {s.label} <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      {/* WALLET INPUT */}
      <section style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{
              flex: 1,
              background: "#020617",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,.5)",
              padding: "6px 10px",
              fontSize: 11
            }}
            placeholder="Check wallet (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <button
            onClick={() => loadSignals()}
            style={{
              background: "#2563eb",
              border: "none",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 11,
              color: "#fff",
              boxShadow: "0 8px 18px rgba(37,99,235,0.45)",
              cursor: "pointer"
            }}
          >
            Check
          </button>
        </div>
      </section>

      {/* SMART WALLET TRACKER PANEL */}
      <section
        style={{
          marginBottom: 12,
          fontSize: 11,
          background:
            "radial-gradient(circle at top, #0b1120 0, #020617 55%, #020617 100%)",
          padding: 10,
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,.2)"
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Smart Wallet Activity
        </div>

        {data?.smart_wallets?.map((w: any) => (
          <div key={w.address}>
            {w.address.slice(0, 8)}... volume {w.volume_eth} ETH
          </div>
        ))}
      </section>

      {/* FILTERS */}
      <section
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          padding: 4,
          borderRadius: 999,
          background: "rgba(15,23,42,.9)"
        }}
      >
        {["all", "liq", "vol", "deploy", "block"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t as TabKey)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "none",
              background: activeTab === t ? "#2563eb" : "transparent",
              fontSize: 11,
              color: "#f9fafb",
              cursor: "pointer"
            }}
          >
            {t}
          </button>
        ))}
      </section>

      {/* SIGNAL LIST */}
      {loading ? (
        <div style={{ fontSize: 13 }}>Loading signals…</div>
      ) : filteredSignals.length === 0 ? (
        <div>No signals</div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          {filteredSignals.map((s) => {
            const m = s.meta || {};

            return (
              <article
                key={s.id}
                style={{
                  borderRadius: 12,
                  padding: 12,
                  background: "linear-gradient(135deg,#020617,#1d2a55)",
                  border: "1px solid rgba(148,163,184,.4)",
                  boxShadow: "0 10px 24px rgba(15,23,42,0.75)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    opacity: 0.7
                  }}
                >
                  <span>{TYPE_LABELS[s.type] || s.type}</span>

                  <span>{s.confidence}</span>
                </div>

                <div style={{ fontSize: 14, margin: "6px 0" }}>
                  {s.description}
                </div>

                {m.tx_hash && (
                  <div style={{ fontSize: 11 }}>
                    <a
                      href={`https://basescan.org/tx/${m.tx_hash}`}
                      target="_blank"
                      style={{ color: "#60a5fa" }}
                    >
                      view tx
                    </a>

                    {" · "}

                    <button
                      onClick={() => copy(m.tx_hash)}
                      style={{
                        fontSize: 10,
                        border: "none",
                        background: "rgba(148,163,184,.2)",
                        borderRadius: 6,
                        padding: "2px 6px",
                        cursor: "pointer"
                      }}
                    >
                      copy
                    </button>
                  </div>
                )}

                {m.address && (
                  <div style={{ fontSize: 11 }}>
                    {m.address}

                    <button
                      onClick={() => copy(m.address)}
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        cursor: "pointer"
                      }}
                    >
                      copy
                    </button>
                  </div>
                )}

                <div
                  style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}
                >
                  {s.observed_at}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <footer
        style={{ fontSize: 10, opacity: 0.6, marginTop: 20 }}
      >
        On-chain observations only. Not trading advice.
      </footer>
    </div>
  );
}
