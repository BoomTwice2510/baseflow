"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

type Signal = {
  id: string;
  type: string;
  category?: string;
  description: string;
<<<<<<< HEAD
  confidence: "high" | "medium" | "low" | string;
=======
  confidence: string;
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
  observed_at: string;
  source: string;
  note?: string;
  meta?: any;
};

type TabKey = "all" | "liq" | "vol" | "deploy" | "block";

<<<<<<< HEAD
type ApiResponse = {
  agent: string;
  chain: string;
  latest_block: number;
  updated_at: string;
  live_feed?: {
    latest_blocks?: number[];
  };
  top_tokens?: { token: string; transfers: number }[];
  smart_wallets?: { address: string; volume_eth: number }[];
  erc8004?: {
    network: string;
    agent_id: number;
    agent_wallet: string;
    explorer_url: string;
  };
  signals: Signal[];
};

=======
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
const TYPE_LABELS: Record<string, string> = {
  liquidity_event: "Liquidity",
  liquidity_migration: "Liquidity",
  volume_anomaly: "Volume",
  whale_transfer: "Whale",
  dex_swap: "DEX",
  contract_deployment: "Deploy",
  block_observation: "Block",
  wallet_overview: "Wallet",
  smart_money_wallet: "Smart Wallet",
  active_token: "Token",
  token_deploy: "Token Launch",
  contract_interaction: "Contract"
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#64748b"
};

export default function HomePage() {
<<<<<<< HEAD
  const [data, setData] = useState<ApiResponse | null>(null);
=======
  const [data, setData] = useState<any>(null);
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
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
<<<<<<< HEAD
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse;
=======
      const res = await fetch(url);
      const json = await res.json();
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e

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
<<<<<<< HEAD
    // Farcaster Mini App splash hide
    sdk?.actions
      ?.ready()
      .then(() => {})
      .catch(() => {});
=======
    sdk.actions.ready().catch(() => {});
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
  }, []);

  const signals: Signal[] = data?.signals || [];

  const walletOverview = signals.find((s) => s.type === "wallet_overview");

  const sortedSignals = [...signals].sort(
    (a, b) =>
      new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  const filteredSignalsRaw = sortedSignals.filter((s) => {
    if (s.type === "wallet_overview") return false;

    if (activeTab === "all") return true;

    const cat = s.category || "";

    if (activeTab === "liq") return cat === "liq";
    if (activeTab === "vol") return cat === "vol";
    if (activeTab === "deploy") return cat === "deploy";
    if (activeTab === "block") return cat === "block";

    return true;
  });

  const filteredSignals = filteredSignalsRaw;

  const recent = sortedSignals
    .filter(
      (s) =>
        s.type === "dex_swap" ||
        s.type === "contract_deployment" ||
        s.type === "token_deploy" ||
        s.type === "liquidity_migration"
    )
    .slice(0, 6);

  const stats = {
    total: signals.length,
    whales: signals.filter((s) => s.type === "whale_transfer").length,
    deploys: signals.filter((s) => s.type === "contract_deployment").length,
    tokens: signals.filter((s) => s.type === "active_token").length
  };

<<<<<<< HEAD
  async function copy(v: string) {
    try {
      await navigator.clipboard.writeText(v);
    } catch (err) {
      console.error("clipboard error", err);
    }
=======
  function copy(v: string) {
    navigator.clipboard.writeText(v);
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
  }

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 430,
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui",
        background:
          "radial-gradient(circle at top, #020617 0, #00010a 30%, #020617 80%)",
        color: "#f9fafb",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.9)",
        borderRadius: 24
      }}
    >
      {/* subtle glow background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.4,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.25), transparent 55%), radial-gradient(circle at 100% 100%, rgba(16,185,129,0.2), transparent 55%)",
          filter: "blur(40px)"
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
              gap: 10
            }}
          >
            {/* logo + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,.4)",
                  background:
                    "conic-gradient(from 140deg, #1d4ed8, #22c55e, #a855f7, #1d4ed8)",
                  padding: 2,
                  boxShadow: "0 0 20px rgba(37,99,235,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "999px",
                    overflow: "hidden",
                    background: "#020617"
                  }}
                >
                  <img
                    src="/hero.png"
                    alt="Base agent logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  BaseFlow Signal Agent
                </div>
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  Real-time on-chain radar
                </span>
              </div>
            </div>

            {/* LIVE pill */}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid rgba(34,197,94,.5)",
                background: autoRefresh
                  ? "linear-gradient(135deg, rgba(22,163,74,.3), rgba(16,185,129,.15))"
                  : "transparent",
                color: autoRefresh ? "#bbf7d0" : "#9ca3af",
                cursor: "pointer",
                transition:
                  "background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease",
                boxShadow: autoRefresh
                  ? "0 0 12px rgba(34,197,94,0.45)"
                  : "none"
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "999px",
                  backgroundColor: autoRefresh ? "#22c55e" : "#6b7280",
                  boxShadow: autoRefresh
                    ? "0 0 10px rgba(34,197,94,0.7)"
                    : "none",
                  transition: "background 0.2s ease, box-shadow 0.2s ease"
                }}
              />
              {autoRefresh ? "LIVE" : "PAUSED"}
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            Chain: Base · Block{" "}
            <strong>{data?.latest_block ?? "loading…"}</strong>
          </div>

          {data?.erc8004 && (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              Agent #{data.erc8004.agent_id}
              {" · "}
              <a
                href={data.erc8004.explorer_url}
                target="_blank"
                style={{
                  color: "#60a5fa",
                  textDecoration: "none",
                  borderBottom: "1px dashed rgba(96,165,250,0.6)"
                }}
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
            gap: 10,
            marginBottom: 12,
            fontSize: 11
          }}
        >
          {/* LIVE BLOCK FEED */}
          <div
            style={{
              position: "relative",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.55))",
              padding: 10,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,.2)",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(15,23,42,0.75)"
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 6,
                position: "relative",
                display: "inline-block"
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: 999,
                  background:
                    "radial-gradient(circle, rgba(56,189,248,.5), transparent 60%)",
                  opacity: 0.25,
                  filter: "blur(6px)",
                  animation: "pulseGlow 2s ease-in-out infinite",
                  pointerEvents: "none"
                }}
              />
              <span style={{ position: "relative" }}>Live Blocks</span>
            </div>

            {data?.live_feed?.latest_blocks?.map((b: number) => (
              <div
                key={b}
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco",
                  fontSize: 11,
                  opacity: 0.9
                }}
              >
                #{b}
              </div>
            ))}
          </div>

          {/* ACTIVE TOKENS */}
          <div
            style={{
              position: "relative",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(56,189,248,0.45))",
              padding: 10,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,.2)",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(15,23,42,0.75)"
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 6,
                position: "relative",
                display: "inline-block"
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: 999,
                  background:
                    "radial-gradient(circle, rgba(96,165,250,.5), transparent 60%)",
                  opacity: 0.25,
                  filter: "blur(6px)",
                  animation: "pulseGlow 2.3s ease-in-out infinite",
                  pointerEvents: "none"
                }}
              />
              <span style={{ position: "relative" }}>Active Tokens</span>
            </div>

            {(!data?.top_tokens || data.top_tokens.length === 0) && (
              <div style={{ opacity: 0.6 }}>No hot tokens yet</div>
            )}

            {data?.top_tokens?.map((t: any) => (
              <div
                key={t.token}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11
                }}
              >
                <span>{t.token.slice(0, 8)}...</span>
                <span style={{ opacity: 0.8 }}>{t.transfers} tx</span>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT ACTIVITY STRIP */}
        {recent.length > 0 && (
          <section
            style={{
              marginBottom: 12,
              fontSize: 11,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch"
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                paddingBottom: 4,
                minWidth: "100%"
              }}
            >
              {recent.map((s) => (
                <div
                  key={s.id}
                  style={{
                    minWidth: 140,
                    padding: "6px 8px",
                    borderRadius: 999,
                    background:
                      s.type === "dex_swap"
                        ? "linear-gradient(135deg,rgba(59,130,246,.3),rgba(56,189,248,.2))"
                        : s.type === "contract_deployment"
                        ? "linear-gradient(135deg,rgba(168,85,247,.35),rgba(59,130,246,.25))"
                        : "linear-gradient(135deg,rgba(34,197,94,.35),rgba(16,185,129,.25))",
                    border: "1px solid rgba(148,163,184,.35)",
                    boxShadow: "0 8px 20px rgba(15,23,42,0.7)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  <div style={{ fontSize: 10, opacity: 0.8 }}>
                    {TYPE_LABELS[s.type] || s.type}
                  </div>
                  <div style={{ fontSize: 11 }}>
                    {s.type === "dex_swap" && "DEX swap"}
                    {s.type === "contract_deployment" && "New contract"}
                    {s.type === "token_deploy" && "Token launch"}
                    {s.type === "liquidity_migration" && "Liquidity move"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STATS */}
        <section
          style={{
            display: "flex",
            gap: 8,
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
                padding: "5px 10px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, rgba(15,23,42,.95), rgba(15,23,42,.7))",
                border: "1px solid rgba(148,163,184,.35)",
                boxShadow: "0 6px 18px rgba(15,23,42,0.7)",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </section>

        {/* WALLET INPUT */}
        <section style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                position: "relative",
                flex: 1
              }}
            >
              <input
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.8))",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,.5)",
                  padding: "7px 12px",
                  fontSize: 11,
                  color: "#f9fafb",
                  outline: "none",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.7)"
                }}
                placeholder="Check wallet (0x...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <span
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 10,
                  opacity: 0.5
                }}
              >
                optional
              </span>
            </div>

            <button
<<<<<<< HEAD
              onClick={() => loadSignals(address)}
=======
              onClick={() => loadSignals()}
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
              style={{
                background:
                  "linear-gradient(135deg,#2563eb,#4f46e5,#7c3aed)",
                border: "none",
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 11,
                color: "#fff",
                boxShadow: "0 10px 26px rgba(37,99,235,0.65)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transform: "translateY(0)",
                transition:
                  "transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease"
              }}
            >
              Scan
            </button>
          </div>
        </section>

        {/* WALLET SNAPSHOT */}
        {walletOverview && (
          <section
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(59,130,246,0.65))",
              border: "1px solid rgba(129,140,248,.7)",
              boxShadow: "0 12px 30px rgba(15,23,42,0.9)",
              fontSize: 11
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Wallet Snapshot
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              Tx: {walletOverview.meta?.tx_count} · In:{" "}
              {walletOverview.meta?.volume_in_eth} ETH · Out:{" "}
              {walletOverview.meta?.volume_out_eth} ETH
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Class: <strong>{walletOverview.meta?.wallet_class}</strong> ·
              Tokens: {walletOverview.meta?.unique_tokens_transfer}
            </div>
          </section>
        )}

        {/* SMART WALLET TRACKER PANEL */}
        <section
          style={{
            marginBottom: 14,
            fontSize: 11,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(37,99,235,0.55))",
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(129,140,248,.5)",
            boxShadow: "0 12px 30px rgba(15,23,42,0.85)"
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>Smart Wallet Activity</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>
              {data?.smart_wallets?.length || 0} wallets
            </span>
          </div>

          {(!data?.smart_wallets || data.smart_wallets.length === 0) && (
            <div style={{ opacity: 0.7 }}>
              No smart money detected in this window.
            </div>
          )}

          {data?.smart_wallets?.map((w: any) => (
            <div
              key={w.address}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4
              }}
            >
              <span>{w.address.slice(0, 8)}...</span>
              <span style={{ fontSize: 11, opacity: 0.9 }}>
                {w.volume_eth} ETH
              </span>
            </div>
          ))}
        </section>

        {/* FILTERS */}
        <section
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 14,
            padding: 4,
            borderRadius: 999,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.8))",
            boxShadow: "0 10px 24px rgba(15,23,42,0.8)"
          }}
        >
          {["all", "liq", "vol", "deploy", "block"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as TabKey)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  activeTab === t
                    ? "linear-gradient(135deg,#2563eb,#22c55e)"
                    : "transparent",
                fontSize: 11,
                color: activeTab === t ? "#f9fafb" : "#9ca3af",
                cursor: "pointer",
                transition:
                  "background 0.15s ease, color 0.15s ease, transform 0.1s ease",
                transform: activeTab === t ? "translateY(-1px)" : "none"
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
          <div style={{ opacity: 0.8 }}>No signals</div>
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
                    position: "relative",
                    borderRadius: 14,
                    padding: 12,
                    background:
                      "linear-gradient(135deg, #020617, #020617, #1d2748)",
                    border: "1px solid rgba(148,163,184,.5)",
                    boxShadow: "0 14px 36px rgba(15,23,42,0.9)",
                    transform: "translateY(0)",
                    transition:
                      "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease"
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow =
                      "0 18px 40px rgba(15,23,42,1)";
                    el.style.borderColor = "rgba(96,165,250,.8)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow =
                      "0 14px 36px rgba(15,23,42,0.9)";
<<<<<<< HEAD
                    el.style.borderColor = "rgba(148,163,184,.5)";
=======
                    el.style.borderColor =
                      "rgba(148,163,184,.5)";
>>>>>>> 137cd21dcbeba778ec199b39c332d126c82dc60e
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      opacity: 0.8,
                      marginBottom: 4
                    }}
                  >
                    <span>{TYPE_LABELS[s.type] || s.type}</span>

                    <span
                      style={{
                        color: PRIORITY_COLOR[s.confidence] || "#9ca3af"
                      }}
                    >
                      {s.confidence}
                    </span>
                  </div>

                  <div style={{ fontSize: 14, margin: "4px 0 6px" }}>
                    {s.description}
                  </div>

                  {s.type === "liquidity_migration" && m.eth_value && (
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      Size: {m.eth_value} ETH
                    </div>
                  )}

                  {s.type === "active_token" && (
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {m.token_address?.slice(0, 10)}... · transfers:{" "}
                      {m.transfer_count}
                    </div>
                  )}

                  {m.tx_hash && (
                    <div style={{ fontSize: 11, marginTop: 6 }}>
                      <a
                        href={`https://basescan.org/tx/${m.tx_hash}`}
                        target="_blank"
                        style={{
                          color: "#60a5fa",
                          textDecoration: "none"
                        }}
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
                    <div style={{ fontSize: 11, marginTop: 4 }}>
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
                    style={{
                      fontSize: 10,
                      opacity: 0.6,
                      marginTop: 6
                    }}
                  >
                    {s.observed_at}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer
          style={{
            fontSize: 10,
            opacity: 0.6,
            marginTop: 22,
            textAlign: "center"
          }}
        >
          On-chain observations only. Not trading advice.
        </footer>
      </div>
    </div>
  );
}
