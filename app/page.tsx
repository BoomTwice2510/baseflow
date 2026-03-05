"use client";

import { useEffect, useState } from "react";

type Signal = {
  id?: string;
  type: string;
  category?: string;
  description?: string;
  confidence?: string;
  observed_at?: string;
  source?: string;
  wallet?: string;
  amount?: number;
  creator?: string;
  contract?: string;
  token?: string;
  tx?: string;
  meta?: any;
};

type TabKey = "all" | "whale" | "deploy" | "volume" | "dex" | "rpc";

const TYPE_LABELS: Record<string, string> = {
  whale_tx: "Whale",
  token_deploy: "Token Launch",
  volume_spike: "Volume",
  dex_signal: "DEX",
  rpc_signal: "RPC"
};

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  async function loadSignals() {
    try {
      setLoading(true);
      const res = await fetch("/api/signals", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("loadSignals error", e);
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

  const signals: Signal[] = data?.signals || [];
  const meta = data?.meta || {};

  const normalizedSignals = signals.map((s) => {
    let cat = s.category;
    if (!cat) {
      if (s.type === "whale_tx") cat = "whale";
      else if (s.type === "token_deploy") cat = "deploy";
      else if (s.type === "volume_spike") cat = "volume";
      else if (s.type.startsWith("dex")) cat = "dex";
      else if (s.type.startsWith("rpc")) cat = "rpc";
    }
    return { ...s, category: cat };
  });

  const sortedSignals = [...normalizedSignals].sort((a, b) => {
    const ta = a.observed_at ? new Date(a.observed_at).getTime() : 0;
    const tb = b.observed_at ? new Date(b.observed_at).getTime() : 0;
    return tb - ta;
  });

  const filteredSignals =
    activeTab === "all"
      ? sortedSignals
      : sortedSignals.filter((s) => s.category === activeTab);

  const whales = normalizedSignals.filter((s) => s.category === "whale");
  const deploys = normalizedSignals.filter((s) => s.category === "deploy");
  const volumes = normalizedSignals.filter((s) => s.category === "volume");
  const dex = normalizedSignals.filter((s) => s.category === "dex");
  const rpc = normalizedSignals.filter((s) => s.category === "rpc");

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 430,
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 35%, #000814 80%)",
        color: "#e5e7eb",
        position: "relative",
        margin: "0 auto",
        overflow: "hidden"
      }}
    >
      {/* soft background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.2), transparent 55%), radial-gradient(circle at 100% 100%, rgba(34,197,94,0.18), transparent 55%)",
          opacity: 0.45,
          filter: "blur(40px)"
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <header style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,.6)",
                  background:
                    "radial-gradient(circle at 30% 0%, #0b1120, #020617 70%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <img
                  src="/hero.png"
                  alt="BaseFlow"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  BASE FLOW SIGNAL
                </div>
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  Live signals from Base chain
                </span>
              </div>
            </div>

            <button
              onClick={() => setAutoRefresh((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,.7)",
                background: autoRefresh
                  ? "linear-gradient(135deg, rgba(56,189,248,.25), rgba(37,99,235,.3))"
                  : "transparent",
                color: autoRefresh ? "#e0f2fe" : "#9ca3af",
                cursor: "pointer",
                boxShadow: autoRefresh
                  ? "0 0 16px rgba(56,189,248,0.6)"
                  : "none",
                transition:
                  "background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease"
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "999px",
                  backgroundColor: autoRefresh ? "#22c55e" : "#6b7280",
                  boxShadow: autoRefresh
                    ? "0 0 10px rgba(34,197,94,0.8)"
                    : "none"
                }}
              />
              {autoRefresh ? "LIVE" : "PAUSED"}
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            Network: Base · Signals:{" "}
            <strong>{meta.filtered_count ?? signals.length}</strong>
          </div>
        </header>

        {/* SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
            fontSize: 11
          }}
        >
          <MiniStat label="Whales" value={whales.length} icon="🐋" />
          <MiniStat label="Deploys" value={deploys.length} icon="🧬" />
          <MiniStat label="Volume" value={volumes.length} icon="📈" />
          <MiniStat label="DEX/RPC" value={dex.length + rpc.length} icon="⚙️" />
        </section>

        {/* FILTER TABS */}
        <section
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            padding: 4,
            borderRadius: 999,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(31,41,55,.9)"
          }}
        >
          {[
            { k: "all", label: "All" },
            { k: "whale", label: "Whales" },
            { k: "deploy", label: "Deploys" },
            { k: "volume", label: "Volume" },
            { k: "dex", label: "DEX" },
            { k: "rpc", label: "RPC" }
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k as TabKey)}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                background:
                  activeTab === t.k
                    ? "linear-gradient(135deg,#38bdf8,#0ea5e9)"
                    : "transparent",
                fontSize: 11,
                color: activeTab === t.k ? "#0b1120" : "#9ca3af",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transform: activeTab === t.k ? "translateY(-1px)" : "none",
                transition:
                  "background 0.15s ease, color 0.15s ease, transform 0.1s ease"
              }}
            >
              {t.label}
            </button>
          ))}
        </section>

        {/* SIGNAL LIST */}
        {loading ? (
          <div style={{ fontSize: 13 }}>Loading signals…</div>
        ) : filteredSignals.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            No signals in this window.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16
            }}
          >
            {filteredSignals.map((s, idx) => {
              const isWhale = s.category === "whale";
              const isDeploy = s.category === "deploy";
              const isVolume = s.category === "volume";

              const title =
                s.type === "whale_tx"
                  ? "Whale Transaction"
                  : s.type === "token_deploy"
                  ? "New Token Deploy"
                  : s.type === "volume_spike"
                  ? "Volume Spike"
                  : TYPE_LABELS[s.type] || s.type;

              const card = {
                borderColor: isWhale
                  ? "rgba(56,189,248,.8)"
                  : isDeploy
                  ? "rgba(129,140,248,.8)"
                  : isVolume
                  ? "rgba(234,179,8,.8)"
                  : "rgba(30,64,175,.7)"
              };

              return (
                <article
                  key={s.id || s.tx || idx}
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    background:
                      "linear-gradient(135deg, #020617, #020617, #0f172a)",
                    border: `1px solid ${card.borderColor}`,
                    boxShadow: "0 12px 30px rgba(15,23,42,0.9)",
                    transform: "translateY(0)",
                    transition:
                      "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease"
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow =
                      "0 18px 40px rgba(15,23,42,1)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow =
                      "0 12px 30px rgba(15,23,42,0.9)";
                  }}
                >
                  {/* header row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12
                      }}
                    >
                      <span>
                        {isWhale && "🐋"}
                        {isDeploy && "🧬"}
                        {isVolume && "📈"}
                        {!isWhale && !isDeploy && !isVolume && "🔍"}
                      </span>
                      <span>{title}</span>
                    </div>
                    {s.confidence && (
                      <span
                        style={{
                          fontSize: 11,
                          color:
                            s.confidence === "high"
                              ? "#22c55e"
                              : s.confidence === "medium"
                              ? "#eab308"
                              : "#9ca3af"
                        }}
                      >
                        {s.confidence}
                      </span>
                    )}
                  </div>

                  {/* main body */}
                  <div style={{ fontSize: 13, marginBottom: 6 }}>
                    {s.description ||
                      (isWhale &&
                        `${(s.amount || 0).toFixed(2)} ETH whale move`) ||
                      (isDeploy && `New token deployed: ${s.contract}`) ||
                      (isVolume &&
                        `Volume spike: ${s.amount?.toLocaleString()} USD`) ||
                      ""}
                  </div>

                  {/* details */}
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {s.wallet && (
                      <div>
                        Wallet:{" "}
                        <span style={{ fontFamily: "monospace" }}>
                          {s.wallet.slice(0, 10)}...
                        </span>
                      </div>
                    )}

                    {s.creator && (
                      <div>
                        Creator:{" "}
                        <span style={{ fontFamily: "monospace" }}>
                          {s.creator.slice(0, 10)}...
                        </span>
                      </div>
                    )}

                    {s.contract && (
                      <div>
                        Token:{" "}
                        <span style={{ fontFamily: "monospace" }}>
                          {s.contract.slice(0, 10)}...
                        </span>
                      </div>
                    )}

                    {s.tx && (
                      <div style={{ marginTop: 4 }}>
                        <a
                          href={`https://basescan.org/tx/${s.tx}`}
                          target="_blank"
                          style={{
                            color: "#38bdf8",
                            textDecoration: "none",
                            fontSize: 11
                          }}
                        >
                          View on Basescan ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {s.observed_at && (
                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.6,
                        marginTop: 6
                      }}
                    >
                      {s.observed_at}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* FEED STATUS */}
        <section
          style={{
            fontSize: 11,
            borderRadius: 16,
            padding: 10,
            background: "rgba(15,23,42,0.94)",
            border: "1px solid rgba(31,41,55,.95)",
            boxShadow: "0 10px 26px rgba(15,23,42,0.9)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6
            }}
          >
            <span>Feed Status</span>
            <span
              style={{
                fontSize: 10,
                color: meta.filtered_count ? "#22c55e" : "#f97316"
              }}
            >
              {meta.filtered_count ? "Active" : "Idle"}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {meta.sources &&
              Object.entries(meta.sources).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(55,65,81,.9)",
                    background: v ? "rgba(34,197,94,0.12)" : "transparent",
                    color: v ? "#bbf7d0" : "#9ca3af",
                    fontSize: 10
                  }}
                >
                  {k.toUpperCase()}
                </span>
              ))}
          </div>

          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 6 }}>
            Raw: {meta.total_raw ?? 0} · Shown: {meta.filtered_count ?? 0}
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 12,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(31,41,55,.9)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        boxShadow: "0 8px 20px rgba(15,23,42,0.9)"
      }}
    >
      <span style={{ fontSize: 11, opacity: 0.75 }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
