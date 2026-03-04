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

const TYPE_LABELS: Record<string, string> = {
  liquidity_event: "Liquidity",
  volume_anomaly: "Volume",
  contract_deployment: "Deploy",
  block_observation: "Block",
  whale_activity: "Whale",
  wallet_overview: "Wallet"
};

type TabKey = "all" | "liq" | "vol" | "deploy" | "block";

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [address, setAddress] = useState<string>("");

  async function loadSignals(customAddress?: string) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const addr = (customAddress ?? address).trim();
      if (addr) params.set("address", addr);
      const url =
        "/api/signals" + (params.toString() ? `?${params.toString()}` : "");

      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load signals", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadSignals();
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // Mini App SDK: mark app as ready so splash screen hides
  useEffect(() => {
    const markReady = async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.error("Failed to signal ready", e);
      }
    };
    markReady();
  }, []);

  const signals: Signal[] = data?.signals || [];

  const filteredSignals = signals.filter((s) => {
    if (activeTab === "all") return true;
    const cat = s.category || "";
    if (activeTab === "liq") {
      return cat === "liq" || s.type === "wallet_overview";
    }
    if (activeTab === "vol") {
      return (
        cat === "vol" ||
        s.type === "volume_anomaly" ||
        s.type === "whale_activity"
      );
    }
    if (activeTab === "deploy") {
      return cat === "deploy" || s.type === "contract_deployment";
    }
    if (activeTab === "block") {
      return cat === "block" || s.type === "block_observation";
    }
    return true;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#050816",
        color: "#f9fafb",
        maxWidth: 480,
        marginInline: "auto"
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 0.2,
            marginBottom: 4
          }}
        >
          BaseFlow Signal Agent
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Chain: <strong>Base</strong> · Block{" "}
          <strong>{data?.latest_block ?? "…"}</strong>
        </div>
        {data?.erc8004 && (
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            ERC‑8004 Agent #{data.erc8004.agent_id} ·{" "}
            <a
              href={data.erc8004.explorer_url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#60a5fa" }}
            >
              View on 8004scan
            </a>
          </div>
        )}
      </header>

      {/* Wallet input */}
      <section style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
          Check any Base wallet&apos;s activity & risk score:
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center"
          }}
        >
          <input
            style={{
              flex: 1,
              backgroundColor: "#020617",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.5)",
              padding: "6px 10px",
              fontSize: 11,
              color: "#e5e7eb"
            }}
            placeholder="Paste Base wallet (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
          />
          <button
            onClick={() => loadSignals()}
            style={{
              borderRadius: 999,
              border: "none",
              backgroundColor: "#2563eb",
              color: "#f9fafb",
              fontSize: 11,
              padding: "6px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            Check
          </button>
        </div>
      </section>

      {/* Controls */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}
      >
        {/* Type filter */}
        <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
          {[
            { key: "all", label: "All" },
            { key: "liq", label: "Liq" },
            { key: "vol", label: "Vol" },
            { key: "deploy", label: "Deploy" },
            { key: "block", label: "Block" }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              style={{
                borderRadius: 999,
                border: "none",
                padding: "4px 10px",
                cursor: "pointer",
                backgroundColor:
                  activeTab === t.key ? "#2563eb" : "rgba(148,163,184,0.2)",
                color: "#f9fafb"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Auto refresh toggle */}
        <button
          onClick={() => setAutoRefresh((v) => !v)}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.5)",
            backgroundColor: autoRefresh ? "#16a34a" : "transparent",
            color: "#f9fafb",
            fontSize: 11,
            padding: "4px 10px",
            cursor: "pointer"
          }}
        >
          Auto {autoRefresh ? "On" : "Off"}
        </button>
      </section>

      {/* Content */}
      {loading ? (
        <div style={{ fontSize: 13, opacity: 0.8 }}>Loading signals…</div>
      ) : filteredSignals.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          No signals in this category yet.
        </div>
      ) : (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 40
          }}
        >
          {filteredSignals.map((s) => {
            const isWalletOverview = s.type === "wallet_overview";
            const m = s.meta || {};

            return (
              <article
                key={s.id}
                style={{
                  borderRadius: 12,
                  padding: 12,
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,1), rgba(30,64,175,0.6))",
                  border: "1px solid rgba(148,163,184,0.4)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    {s.id.slice(0, 26)}…
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    confidence: {s.confidence}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    marginBottom: 4
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor:
                        s.type === "liquidity_event" || s.category === "liq"
                          ? "rgba(56,189,248,0.2)"
                          : s.type === "volume_anomaly" ||
                            s.type === "whale_activity" ||
                            s.category === "vol"
                          ? "rgba(250,204,21,0.2)"
                          : s.type === "contract_deployment" ||
                            s.category === "deploy"
                          ? "rgba(52,211,153,0.2)"
                          : s.type === "wallet_overview"
                          ? "rgba(94,234,212,0.2)"
                          : "rgba(148,163,184,0.3)",
                      border: "1px solid rgba(148,163,184,0.5)"
                    }}
                  >
                    {TYPE_LABELS[s.type] ||
                      TYPE_LABELS[s.category || ""] ||
                      s.type}
                  </span>
                </div>

                {isWalletOverview ? (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        marginBottom: 4,
                        wordBreak: "break-all"
                      }}
                    >
                      {m.address}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        marginBottom: 4
                      }}
                    >
                      Tx: <strong>{m.tx_count ?? 0}</strong> · In:{" "}
                      <span style={{ color: "#4ade80" }}>
                        {m.volume_in_eth ?? 0} ETH
                      </span>{" "}
                      · Out:{" "}
                      <span style={{ color: "#f97373" }}>
                        {m.volume_out_eth ?? 0} ETH
                      </span>
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      Tokens touched:{" "}
                      <strong>{m.unique_tokens_transfer ?? 0}</strong> · Risk
                      score:{" "}
                      <strong style={{ color: "#facc15" }}>
                        {m.risk_score ?? 0}/100
                      </strong>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    {s.description}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.75,
                    marginBottom: 4
                  }}
                >
                  {s.observed_at}
                </div>

                {s.note && (
                  <div style={{ fontSize: 11, opacity: 0.9 }}>{s.note}</div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <footer style={{ fontSize: 10, opacity: 0.6 }}>
        Signals are experimental on‑chain observations only. No trade advice.
      </footer>
    </div>
  );
}
