"use client";

import { useEffect, useState, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type GroupKey = "holders" | "whales" | "volume" | "smart" | "multi";

type signalGroups = {
  holders: Signal[];
  whales: Signal[];
  volume: Signal[];
  smart: Signal[];
  multi: Signal[];
};

type signalResponse = {
  agent: string;
  network: string;
  timestamp: number;
  groups: signalGroups;
  meta: {
    counts: Record<GroupKey, number>;
    limit: number;
    timestamp: string;
  };
};

type Signal = {
  id?: string;
  type: string;
  observed_at?: string;
  source?: string;
  wallet?: string;
  wallet_from?: string;
  wallet_to?: string;
  amount?: number;
  amount_eth?: number;
  usd_value?: number;
  contract?: string;
  token?: string;
  symbol?: string;
  tx?: string;
  tx_hash?: string;
  meta?: any;
  holders_1h?: number;
  holders_24h?: number;
  growth?: number;
  growth_percent?: number;
  volume?: number;
  whales?: number;
  score?: number;
};

function formatTime(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;

  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  };

  return d.toLocaleString("en-IN", opts);
}

const GROUP_CONFIG: {
  key: GroupKey;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    key: "holders",
    label: "Holders",
    icon: "👥",
    desc: "Fast holder growth",
  },
  {
    key: "whales",
    label: "Whales",
    icon: "🐋",
    desc: "Large ETH moves",
  },
  {
    key: "volume",
    label: "Volume",
    icon: "📈",
    desc: "Big trading spikes",
  },
  {
    key: "smart",
    label: "Smart",
    icon: "🧠",
    desc: "Smart wallets buying",
  },
  {
    key: "multi",
    label: "Clusters",
    icon: "🐳",
    desc: "Multi‑whale clusters",
  },
];

export default function HomePage() {
  const [signal, setsignal] = useState<signalResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeGroup, setActiveGroup] = useState<GroupKey>("holders");
  const [activeSignal, setActiveSignal] = useState<{
    group: GroupKey;
    signal: Signal;
  } | null>(null);

  async function loadsignal() {
    try {
      setLoading(true);
      const res = await fetch("/api/signals?limit=5", {
        cache: "no-store",
      });
      const json = (await res.json()) as signalResponse;
      setsignal(json);
    } catch (e) {
      console.error("loadsignal error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadsignal();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadsignal();
    }, 60000); // 60 sec
    return () => clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await new Promise((r) => setTimeout(r, 50));
        if (cancelled) return;
        await sdk.actions.ready();
      } catch (e) {
        console.error("miniapp ready failed", e);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = signal?.groups || {
    holders: [],
    whales: [],
    volume: [],
    smart: [],
    multi: [],
  };

  const counts = signal?.meta?.counts || {
    holders: 0,
    whales: 0,
    volume: 0,
    smart: 0,
    multi: 0,
  };

  const lastUpdated = signal?.meta?.timestamp;

  const currentSignals: Signal[] = useMemo(() => {
    return groups[activeGroup] || [];
  }, [groups, activeGroup]);

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : undefined;

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 430,
        minHeight: "100vh",
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background:
          "radial-gradient(circle at 0% 0%, #e0f2fe 0, #ffffff 45%, #e5f0ff 100%)",
        color: "#0f172a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glassy blue aura */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.25), transparent 55%), radial-gradient(circle at 100% 100%, rgba(37,99,235,0.15), transparent 55%)",
          opacity: 0.9,
          filter: "blur(40px)",
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
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  position: "relative",
                  width: 40,
                  height: 40,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: "999px",
                    border: "1px solid rgba(37,99,235,0.4)",
                    boxShadow: "0 0 18px rgba(59,130,246,0.7)",
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
                      "radial-gradient(circle at 30% 0%, #e0f2fe, #bfdbfe 70%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src="/hero.png"
                    alt="BaseFlow"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#0f172a",
                  }}
                >
                  BaseFlow 🟦
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 999,
                      border: "1px solid rgba(59,130,246,.8)",
                      background:
                        "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(191,219,254,0.9))",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      color: "#1d4ed8",
                    }}
                  >
                    signal
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    fontSize: 10,
                    color: "#1f2933",
                  }}
                >
                  <span>
                    Agent ID:{" "}
                    <span style={{ fontFamily: "monospace" }}>2387</span>
                  </span>
                  <a
                    href="https://www.8004scan.io/agents/base/2387"
                    target="_blank"
                    style={{
                      color: "#2563eb",
                      textDecoration: "none",
                    }}
                  >
                    View on 8004scan ↗
                  </a>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    marginTop: 2,
                  }}
                >
                  Live Dune signal · Top 5 per segment
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
                border: "1px solid rgba(37,99,235,.7)",
                background: autoRefresh
                  ? "linear-gradient(135deg, rgba(219,234,254,.95), rgba(191,219,254,.95))"
                  : "rgba(255,255,255,0.85)",
                color: autoRefresh ? "#1d4ed8" : "#1f2937",
                cursor: "pointer",
                boxShadow: autoRefresh
                  ? "0 0 18px rgba(59,130,246,0.6)"
                  : "0 0 0 rgba(0,0,0,0)",
                transition:
                  "background 0.16s ease, box-shadow 0.16s ease, transform 0.1s ease, border-color 0.16s ease",
                transform: autoRefresh ? "translateY(-1px)" : "none",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "999px",
                  backgroundColor: autoRefresh ? "#22c55e" : "#9ca3af",
                  boxShadow: autoRefresh
                    ? "0 0 10px rgba(34,197,94,0.9)"
                    : "none",
                }}
              />
              <span>{autoRefresh ? "Live 60s" : "Manual"}</span>
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              color: "#1f2937",
            }}
          >
            <span>
              Network: <strong>Base</strong> · Segments:{" "}
              <strong>5</strong>
            </span>
            <span style={{ color: "#64748b" }}>
              signal: {lastUpdated || "–"}
            </span>
          </div>
        </header>

        {/* TABS FOR SEGMENTS */}
        <section
          style={{
            marginBottom: 12,
            padding: 4,
            borderRadius: 999,
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(191,219,254,1)",
            boxShadow: "0 10px 24px rgba(148,163,184,0.35)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 4,
            }}
          >
            {GROUP_CONFIG.map((g) => {
              const isActive = activeGroup === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => setActiveGroup(g.key)}
                  style={{
                    width: "100%",
                    padding: "6px 4px",
                    borderRadius: 999,
                    border: "none",
                    background: isActive
                      ? "linear-gradient(135deg,#60a5fa,#2563eb)"
                      : "transparent",
                    fontSize: 10,
                    color: isActive ? "#ffffff" : "#1e293b",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transform: isActive ? "translateY(-1px)" : "none",
                    boxShadow: isActive
                      ? "0 6px 14px rgba(37,99,235,0.5)"
                      : "none",
                    transition:
                      "background 0.16s ease, color 0.16s ease, transform 0.1s ease, box-shadow 0.16s ease",
                  }}
                >
                  {g.icon} {g.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* segment description + count */}
        <section style={{ marginBottom: 10, fontSize: 11 }}>
          {GROUP_CONFIG.map(
            (g) =>
              g.key === activeGroup && (
                <div
                  key={g.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: "#475569" }}>{g.desc}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#1d4ed8",
                    }}
                  >
                    Raw: {counts[g.key] || 0} · Shown:{" "}
                    {currentSignals.length}
                  </div>
                </div>
              )
          )}
        </section>

        {/* LIST */}
        {loading ? (
          <div
            style={{
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              color: "#1e293b",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "999px",
                border: "2px solid rgba(148,163,184,0.5)",
                borderTopColor: "#60a5fa",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Loading signal…
          </div>
        ) : currentSignals.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              marginBottom: 16,
              color: "#64748b",
            }}
          >
            No recent signals in this segment.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {currentSignals.map((s, idx) => {
              const tx = s.tx_hash || s.tx;
              const amountEth =
                s.amount_eth || s.meta?.eth_amount || s.amount || 0;
              const holders =
                s.holders_1h || s.meta?.holders_1h || 0;
              const growth =
                s.growth_percent || s.growth || s.meta?.growth_percent;
              const vol =
                s.volume ||
                s.meta?.cluster_volume ||
                s.usd_value ||
                s.meta?.usd_value;

              const score = s.score ?? 0;

              let title = s.type;
              if (activeGroup === "whales") title = "Whale Transaction";
              else if (activeGroup === "holders") title = "Holder Spike";
              else if (activeGroup === "volume") title = "Volume Spike";
              else if (activeGroup === "smart") title = "Smart Money Buy";
              else if (activeGroup === "multi")
                title = "Multi‑Whale Cluster";

              let subtitle = "";
              if (activeGroup === "whales") {
                subtitle = `${amountEth.toFixed(2)} ETH move`;
              } else if (activeGroup === "holders") {
                subtitle = `${holders} holders in last hour`;
              } else if (activeGroup === "volume" && vol) {
                subtitle = `$${Math.round(vol).toLocaleString()} traded`;
              } else if (activeGroup === "smart" && vol) {
                subtitle = `$${Math.round(vol).toLocaleString()} buy`;
              } else if (activeGroup === "multi" && vol) {
                subtitle = `$${Math.round(vol).toLocaleString()} cluster`;
              }

              const primaryToken =
                s.symbol || s.token || s.contract || undefined;

              return (
                <button
                  key={tx || s.token || idx}
                  onClick={() =>
                    setActiveSignal({ group: activeGroup, signal: s })
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <article
                    style={{
                      borderRadius: 18,
                      padding: 12,
                      background: "rgba(255,255,255,0.96)",
                      border: "1px solid rgba(191,219,254,1)",
                      boxShadow:
                        "0 14px 28px rgba(148,163,184,0.45)",
                      backdropFilter: "blur(10px)",
                      transform: "translateY(0) scale(1)",
                      transition:
                        "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform =
                        "translateY(-3px) scale(1.01)";
                      el.style.boxShadow =
                        "0 18px 38px rgba(129,140,248,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(0) scale(1)";
                      el.style.boxShadow =
                        "0 14px 28px rgba(148,163,184,0.45)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          color: "#0f172a",
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
                              "radial-gradient(circle at 40% 0%, #e0f2fe, #bfdbfe)",
                            border: "1px solid rgba(191,219,254,1)",
                          }}
                        >
                          {activeGroup === "whales" && "🐋"}
                          {activeGroup === "holders" && "👥"}
                          {activeGroup === "volume" && "📈"}
                          {activeGroup === "smart" && "🧠"}
                          {activeGroup === "multi" && "🐳"}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <span>{title}</span>
                          {subtitle && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                              }}
                            >
                              {subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* animated fire score pill */}
                      <div
                        style={{
                          position: "relative",
                          padding: "4px 10px",
                          borderRadius: 999,
                          background:
                            "linear-gradient(135deg, #fee2e2, #fed7aa)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          boxShadow:
                            "0 0 10px rgba(248,113,113,0.4)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "radial-gradient(circle at 0 0, rgba(251,113,133,0.55), transparent 55%)",
                            animation:
                              "pulseFire 1.6s ease-in-out infinite",
                            pointerEvents: "none",
                          }}
                        />
                        <span
                          style={{
                            position: "relative",
                            fontSize: 12,
                          }}
                        >
                          🔥
                        </span>
                        <span
                          style={{
                            position: "relative",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#7f1d1d",
                          }}
                        >
                          {score.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* compact info row */}
                    <div
                      style={{
                        fontSize: 11,
                        color: "#374151",
                      }}
                    >
                      {primaryToken && (
                        <div>
                          Token:{" "}
                          <span
                            style={{ fontFamily: "monospace" }}
                          >
                            {shortAddr(primaryToken)}
                          </span>
                        </div>
                      )}
                      {activeGroup === "whales" && (
                        <>
                          {s.wallet_from && (
                            <div>
                              From:{" "}
                              <span
                                style={{
                                  fontFamily: "monospace",
                                }}
                              >
                                {shortAddr(s.wallet_from)}
                              </span>
                            </div>
                          )}
                          {s.wallet_to && (
                            <div>
                              To:{" "}
                              <span
                                style={{
                                  fontFamily: "monospace",
                                }}
                              >
                                {shortAddr(s.wallet_to)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {activeGroup === "holders" && growth != null && (
                        <div>Growth: {growth.toFixed(2)}%</div>
                      )}
                      {tx && (
                        <div
                          style={{
                            marginTop: 4,
                            color: "#2563eb",
                            fontSize: 11,
                          }}
                        >
                          Tap to expand • tx {shortAddr(tx)}
                        </div>
                      )}
                    </div>

                    {s.observed_at && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9ca3af",
                          marginTop: 6,
                        }}
                      >
                        {formatTime(s.observed_at)}
                      </div>
                    )}
                  </article>
                </button>
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
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(191,219,254,1)",
            boxShadow: "0 10px 24px rgba(148,163,184,0.35)",
            backdropFilter: "blur(10px)",
            color: "#111827",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span>signal status</span>
            <span
              style={{
                fontSize: 10,
                color:
                  (signal?.meta?.counts?.holders || 0) +
                    (signal?.meta?.counts?.whales || 0) >
                  0
                    ? "#16a34a"
                    : "#f97316",
              }}
            >
              {(signal?.meta?.counts?.holders || 0) +
              (signal?.meta?.counts?.whales || 0)
                ? "Active"
                : "Idle"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            {GROUP_CONFIG.map((g) => (
              <span
                key={g.key}
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(191,219,254,1)",
                  background:
                    (counts[g.key] || 0) > 0
                      ? "rgba(219,234,254,0.9)"
                      : "rgba(248,250,252,0.9)",
                  color:
                    (counts[g.key] || 0) > 0
                      ? "#1d4ed8"
                      : "#6b7280",
                  fontSize: 10,
                }}
              >
                {g.label.toUpperCase()} • {counts[g.key] || 0}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Overlay detail card */}
      {activeSignal && (
        <div
          onClick={() => setActiveSignal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.25)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 430,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              background: "rgba(255,255,255,0.98)",
              border: "1px solid rgba(191,219,254,1)",
              boxShadow:
                "0 -10px 30px rgba(15,23,42,0.3)",
              padding: 16,
              maxHeight: "70vh",
              overflowY: "auto",
              animation: "slideUp 0.18s ease-out",
            }}
          >
            <DetailCard
              group={activeSignal.group}
              signal={activeSignal.signal}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulseFire {
          0% {
            opacity: 0.3;
            transform: translateX(-10%);
          }
          50% {
            opacity: 0.7;
            transform: translateX(10%);
          }
          100% {
            opacity: 0.3;
            transform: translateX(-10%);
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function DetailCard({
  group,
  signal: s,
}: {
  group: GroupKey;
  signal: Signal;
}) {
  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 10)}...${addr.slice(-4)}` : undefined;

  const tx = s.tx_hash || s.tx;
  const token = s.token || s.contract || null;
  const walletFrom = s.wallet_from;
  const walletTo = s.wallet_to;
  const wallet = s.wallet;
  const score = s.score ?? 0;

  const titleMap: Record<GroupKey, string> = {
    holders: "Holder Spike Detail",
    whales: "Whale Transaction Detail",
    volume: "DEX Volume Spike Detail",
    smart: "Smart Money Buy Detail",
    multi: "Multi‑Whale Cluster Detail",
  };

  const amountEth =
    s.amount_eth || s.meta?.eth_amount || s.amount || 0;
  const holders =
    s.holders_1h || s.meta?.holders_1h || 0;
  const growth =
    s.growth_percent || s.growth || s.meta?.growth_percent;
  const vol =
    s.volume ||
    s.meta?.cluster_volume ||
    s.usd_value ||
    s.meta?.usd_value;
  const whales =
    s.whales || s.meta?.whale_wallets || 0;

  return (
    <div>
      {/* header same as before */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#0f172a",
          }}
        >
          {titleMap[group]}
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(191,219,254,1)",
            background: "rgba(239,246,255,1)",
            fontSize: 11,
            color: "#1d4ed8",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🔥 Score {score.toFixed(1)}
        </div>
      </div>

      {/* metrics */}
      <div
        style={{
          fontSize: 11,
          color: "#374151",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginBottom: 10,
        }}
      >
        {group === "whales" && (
          <>
            <div>Amount: {amountEth.toFixed(2)} ETH</div>
            {walletFrom && (
              <div>From: {shortAddr(walletFrom)}</div>
            )}
            {walletTo && <div>To: {shortAddr(walletTo)}</div>}
          </>
        )}

        {group === "holders" && (
          <>
            <div>Holders (1h): {holders}</div>
            {growth != null && (
              <div>Growth: {growth.toFixed(2)}%</div>
            )}
          </>
        )}

        {group === "volume" && vol && (
          <div>
            Volume: ${Math.round(vol).toLocaleString()}
          </div>
        )}

        {group === "smart" && vol && (
          <div>
            Buy size: ${Math.round(vol).toLocaleString()}
          </div>
        )}

        {group === "multi" && (
          <>
            <div>Whales: {whales}</div>
            {vol && (
              <div>
                Cluster volume: $
                {Math.round(vol).toLocaleString()}
              </div>
            )}
          </>
        )}

        {token && (
          <div>
            Token: <span>{shortAddr(token)}</span>
          </div>
        )}

        {tx && (
          <div>
            Tx: <span>{shortAddr(tx)}</span>
          </div>
        )}

        {s.observed_at && (
          <div>Observed: {formatTime(s.observed_at)}</div>
        )}
      </div>

      {/* VERIFY ON BASESCAN SECTION */}
      <div
        style={{
          borderTop: "1px solid rgba(226,232,240,1)",
          paddingTop: 8,
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 2,
          }}
        >
          Verify on BaseScan
        </div>

        {/* tx link (for all where available) */}
        {tx && (
          <a
            href={`https://basescan.org/tx/${tx}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: "#2563eb",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>View transaction</span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#6b7280",
              }}
            >
              {shortAddr(tx)}
            </span>
            <span>↗</span>
          </a>
        )}

        {/* token link (holders, volume, smart, multi) */}
        {token && (
          <a
            href={`https://basescan.org/token/${token}?chain=base`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: "#2563eb",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>View token</span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#6b7280",
              }}
            >
              {shortAddr(token)}
            </span>
            <span>↗</span>
          </a>
        )}

        {/* wallet links where available */}
        {walletFrom && (
          <a
            href={`https://basescan.org/address/${walletFrom}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: "#2563eb",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>From wallet</span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#6b7280",
              }}
            >
              {shortAddr(walletFrom)}
            </span>
            <span>↗</span>
          </a>
        )}

        {walletTo && (
          <a
            href={`https://basescan.org/address/${walletTo}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: "#2563eb",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>To wallet</span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#6b7280",
              }}
            >
              {shortAddr(walletTo)}
            </span>
            <span>↗</span>
          </a>
        )}

        {/* taker wallet for volume / smart / multi */}
        {wallet && !walletFrom && !walletTo && (
          <a
            href={`https://basescan.org/address/${wallet}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: "#2563eb",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Trader wallet</span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#6b7280",
              }}
            >
              {shortAddr(wallet)}
            </span>
            <span>↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
