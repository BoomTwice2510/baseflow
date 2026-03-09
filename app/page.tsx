"use client";

import { useEffect, useState, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

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

  holders_1h?: number;
  growth?: number;
  growth_percent?: number;
  volume?: number;
  whales?: number;
  to?: string;
  score?: number;
};

type TabKey = "all" | "whale" | "volume" | "dex" | "rpc";

const TYPE_LABELS: Record<string, string> = {
  whale_tx: "Whale",
  volume_spike: "Volume",
  dex_signal: "DEX",
  rpc_signal: "RPC",
  smart_money_buy: "Smart Money",
  multi_whale: "Multi Whale",
  holder_spike: "Holder Spike",
};

const TAB_PRIORITY: Record<TabKey, number> = {
  all: 0,
  whale: 1,
  volume: 2,
  dex: 3,
  rpc: 4,
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
    }, 30000);
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

  const timeSortedSignals = useMemo(() => {
    return [...normalizedSignals].sort((a, b) => {
      const ta = a.observed_at ? new Date(a.observed_at).getTime() : 0;
      const tb = b.observed_at ? new Date(b.observed_at).getTime() : 0;
      return tb - ta;
    });
  }, [normalizedSignals]);

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
      {/* glassy blue wash */}
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
        <header style={{ marginBottom: 16 }}>
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
                  BASEFLOW
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
                    Signal Agent
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
                  Live on Base · Watching whales, holders & volume
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
              <span>{autoRefresh ? "Live feed" : "Paused"}</span>
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
              Network: <strong>Base</strong> · Signals:{" "}
              <strong>{meta.filtered_count ?? signals.length}</strong>
            </span>
            <span style={{ color: "#64748b" }}>
              Updated: {lastUpdatedString}
            </span>
          </div>
        </header>

        {/* SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
            fontSize: 11,
          }}
        >
          <MiniStat
            label="Whales"
            value={whales.length}
            icon="🐋"
            caption="Large wallet moves"
          />
          <MiniStat
            label="Holders"
            value={normalizedSignals.filter(
              (s) => s.type === "holder_spike"
            ).length}
            icon="👥"
            caption="Holder spikes"
          />
          <MiniStat
            label="Volume"
            value={volumes.length}
            icon="📈"
            caption="Volume spikes"
          />
          <MiniStat
            label="Total"
            value={meta.filtered_count ?? signals.length}
            icon="📡"
            caption="All active signals"
          />
        </section>

        {/* TABS */}
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
            {[
              { k: "all", label: "All" },
              { k: "whale", label: "Whales" },
              { k: "volume", label: "Volume" },
              { k: "dex", label: "DEX" },
              { k: "rpc", label: "RPC" },
            ].map((t) => {
              const key = t.k as TabKey;
              const isActive = activeTab === key;
              return (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(key)}
                  style={{
                    width: "100%",
                    padding: "6px 4px",
                    borderRadius: 999,
                    border: "none",
                    background: isActive
                      ? "linear-gradient(135deg,#60a5fa,#2563eb)"
                      : "transparent",
                    fontSize: 11,
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
                  {t.label}
                </button>
              );
            })}
          </div>
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
                width: 10,
                height: 10,
                borderRadius: "999px",
                border: "2px solid rgba(148,163,184,0.5)",
                borderTopColor: "#60a5fa",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Fetching fresh signals…
          </div>
        ) : filteredSignals.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              marginBottom: 16,
              color: "#64748b",
            }}
          >
            No signals in this window.
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
                ? "rgba(37,99,235,0.9)"
                : isHolder
                ? "rgba(34,197,94,0.8)"
                : isVolume
                ? "rgba(234,179,8,0.9)"
                : isSmart
                ? "rgba(59,130,246,0.9)"
                : isMulti
                ? "rgba(56,189,248,0.9)"
                : "rgba(148,163,184,0.9)";

              const bg = "rgba(255,255,255,0.92)";

              let mainText: string | undefined = s.description;
              if (!mainText) {
                if (s.type === "whale_tx") {
                  const eth =
                    Number(s.amount || s.meta?.eth_amount || 0).toFixed(
                      2
                    );
                  mainText = `${eth} ETH whale move on Base`;
                } else if (s.type === "volume_spike") {
                  const vol = s.volume ?? s.amount ?? 0;
                  mainText = `Volume spike: $${Math.round(
                    vol
                  ).toLocaleString()} traded`;
                } else if (isHolder) {
                  mainText = `Holder spike on ${shortAddr(s.token)}`;
                } else if (isSmart) {
                  mainText = `Smart money buying ${shortAddr(s.token)}`;
                } else if (isMulti) {
                  mainText = `Clustered whale activity on ${shortAddr(
                    s.token
                  )}`;
                } else if (isDeploy) {
                  mainText = `New token deployed: ${shortAddr(s.contract)}`;
                }
              }

              return (
                <article
                  key={s.id || s.tx || idx}
                  style={{
                    borderRadius: 18,
                    padding: 12,
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    boxShadow:
                      "0 14px 28px rgba(148,163,184,0.45)",
                    backdropFilter: "blur(10px)",
                    transform: "translateY(0) scale(1)",
                    transition:
                      "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-3px) scale(1.01)";
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
                          border: `1px solid ${borderColor}`,
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
                    {s.score != null && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.9)",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                        }}
                      >
                        Score {s.score}
                      </span>
                    )}
                  </div>

                  {mainText && (
                    <div
                      style={{
                        fontSize: 13,
                        marginBottom: 6,
                        color: "#111827",
                      }}
                    >
                      {mainText}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 11,
                      color: "#374151",
                    }}
                  >
                    {isHolder && (
                      <>
                        {s.holders_1h != null && (
                          <div>Holders (1h): {s.holders_1h}</div>
                        )}
                        {(s.growth_percent ?? s.growth) != null && (
                          <div>
                            Growth:{" "}
                            {Number(
                              s.growth_percent ?? s.growth ?? 0
                            ).toFixed(2)}
                            %
                          </div>
                        )}
                        {s.token && (
                          <div>
                            Token:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortAddr(s.token)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {s.type === "whale_tx" && (
                      <>
                        {s.amount != null && (
                          <div>
                            Amount:{" "}
                            {Number(s.amount).toFixed(2)} ETH
                          </div>
                        )}
                        {s.wallet && (
                          <div>
                            From:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortAddr(s.wallet)}
                            </span>
                          </div>
                        )}
                        {s.to && (
                          <div>
                            To:{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {shortAddr(s.to as string)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {s.type === "volume_spike" && s.volume != null && (
                      <div>
                        Volume: $
                        {Math.round(s.volume).toLocaleString()}
                      </div>
                    )}

                    {isSmart && s.amount != null && (
                      <div>
                        Size: $
                        {Math.round(s.amount).toLocaleString()}
                      </div>
                    )}

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
                      </>
                    )}

                    {s.contract && (
                      <div>
                        Contract:{" "}
                        <span style={{ fontFamily: "monospace" }}>
                          {shortAddr(s.contract)}
                        </span>
                      </div>
                    )}

                    {s.tx && (
                      <div style={{ marginTop: 4 }}>
                        <a
                          href={`https://basescan.org/tx/${s.tx}`}
                          target="_blank"
                          style={{
                            color: "#2563eb",
                            textDecoration: "none",
                            fontSize: 11,
                          }}
                        >
                          View on BaseScan ↗
                        </a>
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
            <span>Feed status</span>
            <span
              style={{
                fontSize: 10,
                color: meta.filtered_count ? "#16a34a" : "#f97316",
              }}
            >
              {meta.filtered_count ? "Active" : "Idle"}
            </span>
          </div>

          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
          >
            {meta.sources &&
              Object.entries(meta.sources).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(191,219,254,1)",
                    background: v
                      ? "rgba(219,234,254,0.9)"
                      : "rgba(248,250,252,0.9)",
                    color: v ? "#1d4ed8" : "#6b7280",
                    fontSize: 10,
                  }}
                >
                  {k.toUpperCase()}
                </span>
              ))}
          </div>

          <div
            style={{
              fontSize: 10,
              color: "#9ca3af",
              marginTop: 6,
            }}
          >
            Raw: {meta.total_raw ?? 0} · Shown:{" "}
            {meta.filtered_count ?? 0}
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
  caption,
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
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(191,219,254,1)",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        boxShadow: "0 8px 20px rgba(148,163,184,0.35)",
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ fontSize: 11, color: "#1f2937" }}>
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#1d4ed8",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 9,
          color: "#6b7280",
        }}
      >
        {caption}
      </span>
    </div>
  );
}
