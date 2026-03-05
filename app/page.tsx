// app/page.tsx
import Image from "next/image";
import { Suspense } from "react";

async function fetchSignals() {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!;

const res = await fetch(`${BASE_URL}/api/signals`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load signals");
  return res.json();
}

export default async function HomePage() {
  const data = await fetchSignals();
  const signals = data.signals || [];
  const meta = data.meta || {};

  const whaleSignals = signals.filter((s: any) => s.type === "whale_tx");
  const deploySignals = signals.filter((s: any) => s.type === "token_deploy");
  const volumeSignals = signals.filter((s: any) => s.type === "volume_spike");

  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col items-center">
      {/* Top hero */}
      <section className="w-full max-w-md sm:max-w-2xl px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-2xl border border-sky-200 bg-sky-50 shadow-[0_0_0_4px_rgba(56,189,248,0.2)] overflow-hidden">
            <Image
              src="/hero.png"
              alt="BaseFlow Signal"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              BASE FLOW SIGNAL
            </h1>
            <p className="text-xs text-slate-500">
              Live whales, deploys & volume on Base
            </p>
          </div>
        </div>

        {/* mini app / farcaster friendly header actions */}
        <div className="mt-4 flex gap-2">
          <button className="flex-1 text-xs font-medium rounded-full bg-slate-900 text-white py-2 shadow-md active:scale-[0.97] transition-transform">
            Open in Mini App
          </button>
          <button className="flex-1 text-xs font-medium rounded-full border border-slate-200 text-slate-700 py-2 bg-white shadow-sm active:scale-[0.97] transition-transform">
            View on Farcaster
          </button>
        </div>
      </section>

      {/* Cards grid */}
      <section className="w-full max-w-md sm:max-w-2xl px-4 pb-10 space-y-4">
        {/* Wallet checker */}
        <WalletCheckerCard />

        {/* Whale card */}
        <AnimatedCard
          title="Whale Activity"
          subtitle="High value moves on Base"
          accent="from-sky-100 via-cyan-50 to-blue-100"
          border="border-sky-300"
          icon={
            <div className="h-9 w-9 rounded-2xl bg-sky-500/10 border border-sky-300 flex items-center justify-center animate-pulse">
              <span className="text-sky-600 text-lg">🐋</span>
            </div>
          }
        >
          <ul className="space-y-2">
            {whaleSignals.slice(0, 4).map((w: any, i: number) => (
              <li
                key={w.tx}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800">
                    {w.amount.toFixed(2)} ETH
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                    {w.wallet}
                  </span>
                </div>
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/70 border border-sky-200 px-2 py-0.5 text-[10px] text-sky-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Whale
                </span>
              </li>
            ))}
            {whaleSignals.length === 0 && (
              <p className="text-xs text-slate-400">
                No whales spotted in the latest block.
              </p>
            )}
          </ul>
        </AnimatedCard>

        {/* Deploy card */}
        <AnimatedCard
          title="Fresh Deploys"
          subtitle="New tokens appearing right now"
          accent="from-violet-100 via-indigo-50 to-fuchsia-100"
          border="border-violet-300"
          icon={
            <div className="h-9 w-9 rounded-2xl bg-violet-500/10 border border-violet-300 flex items-center justify-center animate-spin-slow">
              <span className="text-violet-600 text-lg">✨</span>
            </div>
          }
        >
          <ul className="space-y-2">
            {deploySignals.slice(0, 4).map((d: any) => (
              <li
                key={d.contract}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 truncate max-w-[180px]">
                    {d.contract}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                    by {d.creator}
                  </span>
                </div>
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/70 border border-violet-200 px-2 py-0.5 text-[10px] text-violet-700">
                  🧬 New token
                </span>
              </li>
            ))}
            {deploySignals.length === 0 && (
              <p className="text-xs text-slate-400">
                No fresh deploys in the latest scan.
              </p>
            )}
          </ul>
        </AnimatedCard>

        {/* Volume spikes */}
        <AnimatedCard
          title="Volume Spikes"
          subtitle="Unusual on-chain volume"
          accent="from-amber-100 via-orange-50 to-rose-100"
          border="border-amber-300"
          icon={
            <div className="h-9 w-9 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center">
              <span className="text-amber-600 text-lg animate-bounce">📈</span>
            </div>
          }
        >
          <ul className="space-y-2">
            {volumeSignals.slice(0, 4).map((v: any) => (
              <li key={v.id || v.tx || Math.random()} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">
                    {v.amount.toLocaleString()} USD
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {v.token || "Unknown token"}
                  </span>
                </div>
              </li>
            ))}
            {volumeSignals.length === 0 && (
              <p className="text-xs text-slate-400">
                No abnormal volume in the latest window.
              </p>
            )}
          </ul>
        </AnimatedCard>

        {/* Meta / status */}
        <AnimatedCard
          title="Feed Status"
          subtitle="BaseFlow health check"
          accent="from-slate-100 via-slate-50 to-sky-50"
          border="border-slate-200"
          icon={
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 border border-emerald-300 flex items-center justify-center">
              <span className="text-emerald-600 text-lg">✅</span>
            </div>
          }
        >
          <div className="flex flex-wrap gap-2 text-[10px]">
            {meta.sources &&
              Object.entries(meta.sources).map(([key, value]) => (
                <span
                  key={key}
                  className={`px-2 py-0.5 rounded-full border ${
                    value
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {key.toUpperCase()}
                </span>
              ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Raw: {meta.total_raw ?? 0} • Shown: {meta.filtered_count ?? 0}
          </p>
        </AnimatedCard>
      </section>
    </main>
  );
}

// Wallet checker card
function WalletCheckerCard() {
  return (
    <AnimatedCard
      title="Wallet Check"
      subtitle="See if a wallet is active in Base Flow"
      accent="from-cyan-100 via-sky-50 to-emerald-100"
      border="border-cyan-300"
      icon={
        <div className="h-9 w-9 rounded-2xl bg-cyan-500/10 border border-cyan-300 flex items-center justify-center">
          <span className="text-cyan-600 text-lg">👾</span>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Paste Base address (0x...)"
            className="flex-1 rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-[11px] outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-300"
          />
          <button className="rounded-xl bg-cyan-600 text-white px-3 py-2 text-[11px] font-medium active:scale-[0.97] transition-transform">
            Check
          </button>
        </div>
        <p className="text-[10px] text-slate-400">
          Coming soon: smart money score, risk flags & token history.
        </p>
      </div>
    </AnimatedCard>
  );
}

// Reusable animated card
function AnimatedCard({
  title,
  subtitle,
  accent,
  border,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  border: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`
        group relative overflow-hidden rounded-3xl border ${border}
        bg-gradient-to-br ${accent}
        p-[1px] shadow-sm
      `}
    >
      <div
        className="
          relative z-10 rounded-[1.4rem] bg-white/80
          px-4 py-3 flex flex-col gap-2
          backdrop-blur-sm
          transition-transform duration-200 ease-out
          group-hover:-translate-y-0.5 group-hover:shadow-lg
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-[13px] font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] text-slate-500">{subtitle}</p>
            )}
          </div>
          {icon}
        </div>
        <div className="pt-1">{children}</div>
      </div>
      {/* subtle animated border glow */}
      <div
        className="
          pointer-events-none absolute inset-0 opacity-0
          group-hover:opacity-100 transition-opacity duration-300
          bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]
        "
      />
    </div>
  );
}
