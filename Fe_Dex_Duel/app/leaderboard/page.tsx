"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { useLeaderboardRows } from "@/hooks/useLeaderboard";
import { shortenAddress } from "@/lib/constants";

function formatLastUpdate(timestampMs: number): string {
  if (!timestampMs) return "-";
  return new Date(timestampMs).toLocaleString();
}

function rankTone(rank: number): { text: string; bg: string; border: string } {
  if (rank === 1) {
    return { text: "#facc15", bg: "rgba(250,204,21,0.14)", border: "rgba(250,204,21,0.35)" };
  }
  if (rank === 2) {
    return { text: "#cbd5e1", bg: "rgba(203,213,225,0.14)", border: "rgba(203,213,225,0.35)" };
  }
  if (rank === 3) {
    return { text: "#fb923c", bg: "rgba(251,146,60,0.14)", border: "rgba(251,146,60,0.35)" };
  }
  return { text: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.28)" };
}

function rankLabel(rank: number): string {
  if (rank === 1) return "1";
  if (rank === 2) return "2";
  if (rank === 3) return "3";
  return String(rank);
}

function SummaryCard({
  icon,
  label,
  value,
  tint,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string | number;
  tint: string;
  delay?: number;
}) {
  return (
    <div
      className="animate-card-enter rounded-2xl border border-slate-800/80 bg-slate-900/65 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.35)] backdrop-blur-xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: `${tint}66`, backgroundColor: `${tint}1a` }}>
          <span className="material-symbols-outlined text-xl" style={{ color: tint }}>
            {icon}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="text-2xl font-extrabold" style={{ color: tint }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  player,
  rank,
  totalScore,
  winEvents,
  currentStreak,
  updateEvents,
  isMe,
  isFeatured = false,
}: {
  player: string;
  rank: number;
  totalScore: number;
  winEvents: number;
  currentStreak: number;
  updateEvents: number;
  isMe: boolean;
  isFeatured?: boolean;
}) {
  const tone = rankTone(rank);

  return (
    <article
      className="relative overflow-hidden rounded-2xl border bg-slate-900/70 p-5 shadow-[0_18px_38px_rgba(2,6,23,0.42)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1"
      style={{
        borderColor: tone.border,
        boxShadow: isFeatured
          ? `0 20px 45px rgba(2,6,23,0.55), 0 0 0 1px ${tone.border}`
          : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(circle at 50% 0%, ${tone.bg}, transparent 55%)` }}
      />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-sm font-bold"
            style={{ color: tone.text, borderColor: tone.border, backgroundColor: tone.bg }}
          >
            {rankLabel(rank)}
          </span>
          {isMe && (
            <span className="rounded-full border border-teal-400/40 bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-200">
              You
            </span>
          )}
        </div>

        <p className="truncate text-sm font-semibold text-slate-200">{shortenAddress(player, 8)}</p>
        <p className="mt-2 text-3xl font-black" style={{ color: tone.text }}>
          {totalScore.toLocaleString()}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">points</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Wins", value: winEvents },
            { label: "Streak", value: currentStreak },
            { label: "Updates", value: updateEvents },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800/80 bg-slate-950/70 p-2 text-center">
              <p className="text-sm font-bold text-slate-100">{item.value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-sm font-semibold text-teal-300">{score}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #2dd4bf 0%, #38bdf8 100%)",
          }}
        />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const account = useCurrentAccount();
  const [search, setSearch] = useState("");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const leaderboardQuery = useLeaderboardRows();
  const rows = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);
  const normalizedAccount = account?.address.toLowerCase() ?? "";

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => row.player.toLowerCase().includes(keyword));
  }, [rows, search]);

  const podium = useMemo(() => rows.slice(0, 3), [rows]);
  const maxScore = useMemo(() => rows[0]?.totalScore ?? 0, [rows]);
  const totalScore = useMemo(() => rows.reduce((sum, row) => sum + row.totalScore, 0), [rows]);
  const lastUpdated = useMemo(() => rows.reduce((max, row) => Math.max(max, row.lastUpdateMs), 0), [rows]);

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 8% 10%, rgba(45,212,191,0.08), transparent 30%), radial-gradient(circle at 92% 12%, rgba(250,204,21,0.07), transparent 34%)",
          }}
        />
        <div className="blue-cyber-grid absolute inset-0 opacity-15" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8">
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
              <span className="material-symbols-outlined text-sm">emoji_events</span>
              Live Rankings
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-400">
                Last event: {mounted ? formatLastUpdate(lastUpdated) : "--"}
              </span>
              <button
                type="button"
                onClick={() => leaderboardQuery.refetch()}
                className="rounded-lg border border-cyan-400/35 bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/55 hover:bg-cyan-500/20"
              >
                Refresh
              </button>
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            On-Chain <span className="text-cyan-300">Leaderboard</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Aggregated from on-chain <code className="text-slate-300">ScoreUpdated</code> events.
          </p>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SummaryCard icon="groups" label="Total Players" value={rows.length} tint="#2dd4bf" delay={0} />
          <SummaryCard icon="bar_chart" label="Total Score" value={totalScore.toLocaleString()} tint="#38bdf8" delay={70} />
          <SummaryCard icon="workspace_premium" label="Top Score" value={(rows[0]?.totalScore ?? 0).toLocaleString()} tint="#facc15" delay={140} />
        </section>

        {podium.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Hall Of Fame</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-300/30 to-transparent" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((row, index) => {
                if (!row) return null;
                return (
                  <div key={row.player} className={index === 1 ? "lg:-mt-3" : "lg:mt-3"}>
                    <PodiumCard
                      player={row.player}
                      rank={row.rank}
                      totalScore={row.totalScore}
                      winEvents={row.winEvents}
                      currentStreak={row.currentStreak}
                      updateEvents={row.updateEvents}
                      isMe={row.player.toLowerCase() === normalizedAccount}
                      isFeatured={index === 1}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
            All Players ({filteredRows.length})
          </h2>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-500">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search wallet address..."
              className="form-field-glow w-full rounded-xl border border-slate-700/80 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none md:w-80"
            />
          </div>
        </section>

        {leaderboardQuery.isLoading && (
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
            <div className="space-y-3">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="grid grid-cols-[56px_1fr_180px_80px_90px_150px] gap-3">
                  <div className="h-6 rounded-md animate-shimmer" />
                  <div className="h-6 rounded-md animate-shimmer" />
                  <div className="h-6 rounded-md animate-shimmer" />
                  <div className="h-6 rounded-md animate-shimmer" />
                  <div className="h-6 rounded-md animate-shimmer" />
                  <div className="h-6 rounded-md animate-shimmer" />
                </div>
              ))}
            </div>
          </section>
        )}

        {leaderboardQuery.isError && (
          <section className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm font-medium text-rose-200">
            Failed to load leaderboard:{" "}
            {leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : "Unknown error"}
          </section>
        )}

        {!leaderboardQuery.isLoading && !leaderboardQuery.isError && filteredRows.length === 0 && (
          <section className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/55 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-500">leaderboard</span>
            <p className="mt-2 text-sm text-slate-400">No leaderboard data found.</p>
          </section>
        )}

        {!leaderboardQuery.isLoading && !leaderboardQuery.isError && filteredRows.length > 0 && (
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/65 shadow-[0_16px_34px_rgba(2,6,23,0.4)] backdrop-blur-xl">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead className="bg-slate-950/45">
                  <tr className="border-b border-slate-800/80">
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Rank</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Player</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Score</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Wins</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Streak</th>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const tone = rankTone(row.rank);
                    const isMe = row.player.toLowerCase() === normalizedAccount;
                    return (
                      <tr
                        key={row.player}
                        className="border-b border-slate-800/70 transition-colors hover:bg-slate-800/25"
                        style={{ backgroundColor: isMe ? "rgba(45,212,191,0.07)" : undefined }}
                      >
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-xs font-bold"
                            style={{ color: tone.text, borderColor: tone.border, backgroundColor: tone.bg }}
                          >
                            {rankLabel(row.rank)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-bold"
                              style={{ color: tone.text, borderColor: tone.border, backgroundColor: tone.bg }}
                            >
                              {row.player.slice(2, 4).toUpperCase()}
                            </div>
                            <span className="truncate text-sm font-semibold text-slate-200">{shortenAddress(row.player, 6)}</span>
                            {isMe && (
                              <span className="rounded-full border border-teal-400/40 bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-200">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <ScoreBar score={row.totalScore} maxScore={maxScore} />
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-slate-300">{row.winEvents}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 text-sm font-semibold text-slate-300">
                            {row.currentStreak > 0 && <span className="text-amber-300">+</span>}
                            {row.currentStreak}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {mounted ? formatLastUpdate(row.lastUpdateMs) : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredRows.map((row) => {
                const tone = rankTone(row.rank);
                const isMe = row.player.toLowerCase() === normalizedAccount;
                return (
                  <article
                    key={row.player}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3"
                    style={{ backgroundColor: isMe ? "rgba(45,212,191,0.08)" : undefined }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-xs font-bold"
                          style={{ color: tone.text, borderColor: tone.border, backgroundColor: tone.bg }}
                        >
                          {rankLabel(row.rank)}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">{shortenAddress(row.player, 6)}</span>
                      </div>
                      {isMe && (
                        <span className="rounded-full border border-teal-400/40 bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-200">
                          You
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <ScoreBar score={row.totalScore} maxScore={maxScore} />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-1.5">
                          <p className="text-xs font-semibold text-slate-200">{row.winEvents}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Wins</p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-1.5">
                          <p className="text-xs font-semibold text-slate-200">{row.currentStreak}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Streak</p>
                        </div>
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-1.5">
                          <p className="text-xs font-semibold text-slate-200">{row.updateEvents}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Updates</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">{mounted ? formatLastUpdate(row.lastUpdateMs) : "--"}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
