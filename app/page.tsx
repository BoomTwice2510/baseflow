"use client";

import { useEffect, useState } from "react";

type Signal = {
  id: string;
  type: string;
  description: string;
  confidence: string;
  observed_at: string;
  source: string;
  note: string;
};

const TYPE_LABELS: Record<string, string> = {
  liquidity_event: "Liquidity",
  volume_anomaly: "Volume",
  contract_deployment: "Deploy",
  block_observation: "Block"
};

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");

  async function loadSignals() {
    try {
      const res = await fetch("/api/signals");
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
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadSignals();
    }, 15000); // 15 sec
    return () => clearInterval(id);
  }, [autoRefresh]);

  const signals: Signal[] = data?.signals || [];
  const filteredSignals =
    selectedType === "all"
      ? signals
      : signals.filter((s) => s.type === selectedType);

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#050816",
        color: "#f9fafb",
        maxWidth: 480,
        marginInline: "auto"
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: 16 }}>
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
        {data && (
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            Range: {data.searched_from_block} → {data.searched_to_block}
          </div>
        )}
      </header>

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
            { key: "liquidity_event", label: "Liq" },
            { key: "volume_anomaly", label: "Vol" },
            { key: "contract_deployment", label: "Deploy" },
            { key: "block_observation", label: "Block" }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              style={{
                borderRadius: 999,
                border: "none",
                padding: "4px 10px",
                cursor: "pointer",
                backgroundColor:
                  selectedType === t.key ? "#2563eb" : "rgba(148,163,184,0.2)",
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
          {filteredSignals.map((s) => (
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
                <span style={{ fontSize: 11, opacity: 0.7 }}>{s.id}</span>
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
                      s.type === "liquidity_event"
                        ? "rgba(56,189,248,0.2)"
                        : s.type === "volume_anomaly"
                        ? "rgba(250,204,21,0.2)"
                        : s.type === "contract_deployment"
                        ? "rgba(52,211,153,0.2)"
                        : "rgba(148,163,184,0.3)",
                    border: "1px solid rgba(148,163,184,0.5)"
                  }}
                >
                  {TYPE_LABELS[s.type] || s.type}
                </span>
              </div>

              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {s.description}
              </div>

              <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>
                {s.observed_at}
              </div>

              <div style={{ fontSize: 11, opacity: 0.9 }}>{s.note}</div>
            </article>
          ))}
        </section>
      )}

      <footer style={{ fontSize: 10, opacity: 0.6 }}>
        Signals are experimental on‑chain observations only. No trade advice.
      </footer>
    </div>
  );
}
