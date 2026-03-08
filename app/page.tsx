"use client";

import { useEffect, useState, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

function formatTime(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;

  // IST offset
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  };

  return d.toLocaleString("en-IN", opts);
}

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

  // extra Dune fields
  holders_1h?: number;
  growth?: number;
  volume?: number;
  whales?: number;
  to?: string;
};

type TabKey = "all" | "whale" | "volume" | "dex" | "rpc";

const TYPE_LABELS: Record<string, string> = {
  whale_tx: "Whale",
  volume_spike: "Volume",
  dex_signal: "DEX",
  rpc_signal: "RPC",
  smart_money_buy: "Smart Money",
  multi_whale: "Multi Whale",
  holder_spike: "Holder Spike"
};

// tab priority for ordering
const TAB_PRIORITY: Record<TabKey, number> = {
  all: 0,
  whale: 1,
  volume: 2,
  dex: 3,
  rpc: 4
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

  useEffect(() => {
    if (!loading) {
      sdk.actions.ready().catch(() => {});
    }
  }, [loading]);

  const signals: Signal[] = data?.signals || [];
  const meta = data?.meta || {};

  const normalizedSignals = useMemo(
    () =>
      signals.map((s) => {
        let cat = s.category as TabKey | undefined;
        if (!cat) {
          if (s.type === "whale_tx") cat = "whale";
          else if (s.type === "volume_spike") cat = "volume";
          else if (
            s.type.startsWith("dex") ||
            s.type === "liquidity_added" ||
            s.type === "uniswap_pool_created"
          )
            cat = "dex";
          else if (s.type.startsWith("rpc") || s.type === "gas_spike")
            cat = "rpc";
        }
        return { ...s, category: cat };
      }),
    [signals]
  );

  // time sort desc
  const timeSortedSignals = useMemo(() => {
    return [...normalizedSignals].sort((a, b) => {
      const ta = a.observed_at ? new Date(a.observed_at).getTime() : 0;
      const tb = b.observed_at ? new Date(b.observed_at).getTime() : 0;
      return tb - ta;
    });
  }, [normalizedSignals]);

  // overall order: by tab priority, then time
  const orderedSignals = useMemo(() => {
    return [...timeSortedSignals].sort((a, b) => {
      const pa = TAB_PRIORITY[(a.category as TabKey) || "rpc"];
      const pb = TAB_PRIORITY[(b.category as TabKey) || "rpc"];
      if (pa !== pb) return pa - pb;
      const ta = a.observed_at ? new Date(a.observed_at).getTime() : 0;
      const tb = b.observed_at ? new Date(b.observed_at).getTime() : 0;
      return tb - ta;
    });
  }, [timeSortedSignals]);

  const filteredSignals =
    activeTab === "all"
      ? orderedSignals
      : orderedSignals.filter((s) => s.category === activeTab);

  const whales = normalizedSignals.filter((s) => s.category === "whale");
  const volumes = normalizedSignals.filter((s) => s.category === "volume");
  const dex = normalizedSignals.filter((s) => s.category === "dex");
  const rpc = normalizedSignals.filter((s) => s.category === "rpc");

  const lastUpdatedRaw = data?.timestamp ?? signals[0]?.observed_at ?? null;

  const lastUpdatedString =
    lastUpdatedRaw == null
      ? "–"
      : typeof lastUpdatedRaw === "number"
      ? new Date(lastUpdatedRaw).toISOString()
      : String(lastUpdatedRaw);

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 430,
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 40%, #020617 100%)",
        color: "#e5e7eb",
        position: "relative",
        margin: "0 auto",
        overflow: "hidden"
      }}
    >
      {/* BASE blue background wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(37,99,235,0.35), transparent 55%)",
          opacity: 0.9,
          filter: "blur(40px)"
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <header style={{ marginBottom: 14 }}>
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
                  position: "relative",
                  width: 38,
                  height: 38
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "999px",
                    border: "1px solid rgba(59,130,246,0.6)",
                    opacity: 0.55,
                    boxShadow: "0 0 18px rgba(59,130,246,0.85)"
                  }}
                />
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,.7)",
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
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  BASEFLOW
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 999,
                      border: "1px solid rgba(96,165,250,.7)",
                      background:
                        "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.7))",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      color: "#dbeafe"
                    }}
                  >
                    Signal Agent
                  </span>
                </div>

                {/* Agent ID + 8004scan link */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      opacity: 0.8
                    }}
                  >
                    Agent ID:{" "}
                    <span style={{ fontFamily: "monospace" }}>2387</span>
                  </span>
                  <a
                    href="https://www.8004scan.io/agents/base/2387"
                    target="_blank"
                    style={{
                      fontSize: 10,
                      color: "#bfdbfe",
                      textDecoration: "none"
                    }}
                  >
                    Go to 8004scan ↗
                  </a>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    opacity: 0.85,
                    marginTop: 2
                  }}
                >
                  Live on Base · Watching whales, pools & volume
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
                padding: "6px 13px",
                borderRadius: 999,
                border: "1px solid rgba(59,130,246,.8)",
                background: autoRefresh
                  ? "linear-gradient(135deg, rgba(96,165,250,.35), rgba(37,99,235,.6))"
                  : "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,1))",
                color: autoRefresh ? "#eff6ff" : "#cbd5f5",
                cursor: "pointer",
                boxShadow: autoRefresh
                  ? "0 0 18px rgba(59,130,246,0.9)"
                  : "0 0 0 rgba(0,0,0,0)",
                transition:
                  "background 0.16s ease, box-shadow 0.16s ease, transform 0.1s ease, border-color 0.16s ease",
                transform: autoRefresh ? "translateY(-1px)" : "none"
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "999px",
                  backgroundColor: autoRefresh ? "#22c55e" : "#6b7280",
                  boxShadow: autoRefresh
                    ? "0 0 10px rgba(34,197,94,0.9)"
                    : "none"
                }}
              />
              <span>{autoRefresh ? "Live feed" : "Paused"}</span>
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              opacity: 0.9,
              marginTop: 6,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            <span>
              Network: <strong>Base</strong> · Signals:{" "}
              <strong>{meta.filtered_count ?? signals.length}</strong>
            </span>
            <span style={{ opacity: 0.7 }}>Updated: {lastUpdatedString}</span>
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
          <MiniStat
            label="Whales"
            value={whales.length}
            icon="🐋"
            caption="Large wallet moves on Base"
          />
          <MiniStat
            label="Volume"
            value={volumes.length}
            icon="📈"
            caption="Unusual trading volume"
          />
          <MiniStat
            label="DEX / RPC"
            value={dex.length + rpc.length}
            icon="⚙️"
            caption="Pools & infra activity"
          />
          <MiniStat
            label="Total signals"
            value={meta.filtered_count ?? signals.length}
            icon="📡"
            caption="All active signals"
          />
        </section>

        {/* FILTER TABS */}
        <section
          style={{
            marginBottom: 12,
            padding: 4,
            borderRadius: 999,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
            border: "1px solid rgba(30,64,175,.95)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.95)"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 4
            }}
          >
            {[
              { k: "all", label: "All" },
              { k: "whale", label: "Whales" },
              { k: "volume", label: "Volume" },
              { k: "dex", label: "DEX" },
              { k: "rpc", label: "RPC" }
            ].map((t) => {
              const isActive = activeTab === (t.k as TabKey);
              return (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k as TabKey)}
                  style={{
                    width: "100%",
                    padding: "6px 4px",
                    borderRadius: 999,
                    border: "none",
                    background: isActive
                      ? "linear-gradient(135deg,#60a5fa,#2563eb)"
                      : "transparent",
                    fontSize: 11,
                    color: isActive ? "#0b1120" : "#cbd5f5",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transform: isActive ? "translateY(-1px)" : "none",
                    boxShadow: isActive
                      ? "0 8px 18px rgba(37,99,235,0.85)"
                      : "none",
                    transition:
                      "background 0.16s ease, color 0.16s ease, transform 0.1s ease, box-shadow 0.16s ease"
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* SIGNAL LIST */}
        {loading ? (
          <div
            style={{
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                border: "2px solid rgba(148,163,184,0.5)",
                borderTopColor: "#60a5fa",
                animation: "spin 0.8s linear infinite"
              }}
            />
            Fetching fresh signals…
          </div>
        ) : filteredSignals.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
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
              const isVolume = s.category === "volume";
              const isDeploy =
                s.type === "deploy" ||
                s.type?.toLowerCase().includes("deploy");
              const isHolder = s.type === "holder_spike";
              const isSmart = s.type === "smart_money_buy";
              const isMulti = s.type === "multi_whale";

              const title =
                s.type === "whale_tx"
                  ? "Whale Transaction"
                  : s.type === "volume_spike"
                  ? "Volume Spike"
                  : s.type === "holder_spike"
                  ? "Holder Spike"
                  : s.type === "smart_money_buy"
                  ? "Smart Money Buy"
                  : s.type === "multi_whale"
                  ? "Multi Whale Cluster"
                  : TYPE_LABELS[s.type] || s.type;

              const borderColor = isWhale
                ? "rgba(96,165,250,1)"
                : isDeploy
                ? "rgba(129,140,248,1)"
                : isVolume
                ? "rgba(234,179,8,1)"
                : isHolder
                ? "rgba(52,211,153,1)"
                : isSmart
                ? "rgba(244,114,182,1)"
                : isMulti
                ? "rgba(248,113,113,1)"
                : "rgba(37,99,235,1)";

              const glowColor = isWhale
                ? "rgba(96,165,250,0.8)"
                : isDeploy
                ? "rgba(129,140,248,0.8)"
                : isVolume
                ? "rgba(234,179,8,0.75)"
                : isHolder
                ? "rgba(52,211,153,0.75)"
                : isSmart
                ? "rgba(244,114,182,0.8)"
                : isMulti
                ? "rgba(248,113,113,0.85)"
                : "rgba(37,99,235,0.75)";

              const shortToken = (addr?: string) =>
                addr
                  ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
                  : undefined;

              // main description per type
              let mainText: string | undefined = s.description;
              if (!mainText) {
                if (s.type === "whale_tx") {
                  mainText = `${(s.amount || 0).toFixed(
                    2
                  )} ETH whale move on Base`;
                } else if (s.type === "volume_spike") {
                  const vol = s.volume ?? s.amount ?? 0;
                  mainText = `Volume spike: $${Math.round(
                    vol
                  ).toLocaleString()} traded`;
                } else if (s.type === "holder_spike") {
                  mainText = `Holder spike detected on ${shortToken(
                    s.token
                  )}`;
                } else if (s.type === "smart_money_buy") {
                  mainText = `Smart money buying ${shortToken(
                    s.token
                  )} on Base`;
                } else if (s.type === "multi_whale") {
                  mainText = `Clustered whale activity on ${shortToken(
                    s.token
                  )}`;
                } else if (isDeploy) {
                  mainText = `New token deployed: ${shortToken(s.contract)}`;
                }
              }

              return (
                <article
                  key={s.id || s.tx || idx}
                  style={{
                    borderRadius: 18,
                    padding: 12,
                    background:
                      "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
                    border: `1px solid ${borderColor}`,
                    boxShadow:
                      "0 14px 32px rgba(15,23,42,0.96), 0 0 0 1px rgba(15,23,42,0.9)",
                    backdropFilter: "blur(12px)",
                    transform: "translateY(0) scale(1)",
                    transition:
                      "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease"
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-3px) scale(1.01)";
                    el.style.boxShadow = `0 20px 40px ${glowColor}`;
                    el.style.background =
                      "linear-gradient(145deg, rgba(15,23,42,1), rgba(15,23,42,0.96))";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0) scale(1)";
                    el.style.boxShadow =
                      "0 14px 32px rgba(15,23,42,0.96), 0 0 0 1px rgba(15,23,42,0.9)";
                    el.style.background =
                      "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))";
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
                        gap: 8,
                        fontSize: 12
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "radial-gradient(circle at 40% 0%, rgba(15,23,42,0.95), rgba(15,23,42,0.8))",
                          border: `1px solid ${borderColor}`
                        }}
                      >
                        {isWhale && "🐋"}
                        {isDeploy && "🧬"}
                        {isVolume && "📈"}
                        {isHolder && "👥"}
                        {isSmart && "🧠"}
                        {isMulti && "🐳"}
                        {!isWhale &&
                          !isDeploy &&
                          !isVolume &&
                          !isHolder &&
                          !isSmart &&
                          !isMulti &&
                          "🔍"}
                      </span>
                      <span>{title}</span>
                    </div>
                    {s.confidence && (
                      <span
                        style={{
                          fontSize: 11,
                          textTransform: "capitalize",
                          padding: "2px 7px",
                          borderRadius: 999,
                          border: "1px solid rgba(55,65,81,0.95)",
                          background: "rgba(15,23,42,0.98)",
                          color:
                            s.confidence === "high"
                              ? "#4ade80"
                              : s.confidence === "medium"
                              ? "#fde047"
                              : "#e5e7eb"
                        }}
                      >
                        {s.confidence}
                      </span>
                    )}
                  </div>

                  {/* main body */}
                  {mainText && (
                    <div style={{ fontSize: 13, marginBottom: 6 }}>
                      {mainText}
                    </div>
                  )}

                  {/* details */}
                  <div style={{ fontSize: 11, opacity: 0.9 }}>
                    {/* holder_spike specific */}
                    {isHolder && (
                      <>
                        {s.holders_1h != null && (
                          <div>Holders (1h): {s.holders_1h}</div>
                        )}
                        {s.growth != null && (
                          <div>
                            Growth:{" "}
                            {Number(s.growth || 0).toFixed(2)}
                            %
                          </div>
                        )}
                        {s.token && (
                          <div>
                            Token:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.token)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* whale_tx */}
                    {s.type === "whale_tx" && (
                      <>
                        {s.amount != null && (
                          <div>Amount: {Number(s.amount).toFixed(2)} ETH</div>
                        )}
                        {s.wallet && (
                          <div>
                            From:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.wallet)}
                            </span>
                          </div>
                        )}
                        {s.to && (
                          <div>
                            To:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.to as string)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* volume_spike */}
                    {s.type === "volume_spike" && (
                      <>
                        {s.volume != null && (
                          <div>
                            Volume: $
                            {Math.round(s.volume).toLocaleString()}
                          </div>
                        )}
                        {s.token && (
                          <div>
                            Token:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {s.token}
                            </span>
                          </div>
                        )}
                        {s.wallet && (
                          <div>
                            Taker:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.wallet)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* smart_money_buy */}
                    {isSmart && (
                      <>
                        {s.amount != null && (
                          <div>
                            Size: $
                            {Math.round(s.amount).toLocaleString()}
                          </div>
                        )}
                        {s.wallet && (
                          <div>
                            Wallet:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.wallet)}
                            </span>
                          </div>
                        )}
                        {s.token && (
                          <div>
                            Token:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.token)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* multi_whale */}
                    {isMulti && (
                      <>
                        {s.whales != null && (
                          <div>Whales: {s.whales}</div>
                        )}
                        {s.volume != null && (
                          <div>
                            Cluster volume: $
                            {Math.round(s.volume).toLocaleString()}
                          </div>
                        )}
                        {s.token && (
                          <div>
                            Token:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortToken(s.token)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* generic fields */}
                    {s.wallet && !isWhale && !isVolume && !isSmart && !isMulti && (
                      <div>
                        Wallet:{" "}
                        <span style={{ fontFamily: "monospace" }}>
                          {shortToken(s.wallet)}
                        </span>
                      </div>
                    )}

                    {s.contract && (
                      <div>
                        Contract:{" "}
                        <span style={{ fontFamily: "monospace" }}>
                          {shortToken(s.contract)}
                        </span>
                      </div>
                    )}

                    {s.tx && (
                      <div style={{ marginTop: 4 }}>
                        <a
                          href={`https://basescan.org/tx/${s.tx}`}
                          target="_blank"
                          style={{
                            color: "#bfdbfe",
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
                        opacity: 0.65,
                        marginTop: 6
                      }}
                    >
                      {formatTime(s.observed_at)}
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
            marginBottom: 4,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
            border: "1px solid rgba(30,64,175,.98)",
            boxShadow: "0 10px 26px rgba(15,23,42,0.97)",
            backdropFilter: "blur(12px)"
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
                color: meta.filtered_count ? "#4ade80" : "#f97316"
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
                    border: "1px solid rgba(55,65,81,.98)",
                    background: v ? "rgba(34,197,94,0.12)" : "transparent",
                    color: v ? "#bbf7d0" : "#e5e7eb",
                    fontSize: 10
                  }}
                >
                  {k.toUpperCase()}
                </span>
              ))}
          </div>

          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6 }}>
            Raw: {meta.total_raw ?? 0} · Shown: {meta.filtered_count ?? 0}
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  caption
}: {
  label: string;
  value: number;
  icon: string;
  caption: string;
}) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 12,
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.99), rgba(15,23,42,0.95))",
        border: "1px solid rgba(30,64,175,.95)",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        boxShadow: "0 8px 20px rgba(15,23,42,0.97)",
        backdropFilter: "blur(10px)"
      }}
    >
      <span style={{ fontSize: 11, opacity: 0.85 }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: "#eff6ff" }}>
        {value}
      </span>
      <span
        style={{
          fontSize: 9,
          opacity: 0.7,
          color: "#c7d2fe"
        }}
      >
        {caption}
      </span>
    </div>
  );
}
