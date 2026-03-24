"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useMultiRoundTournaments, type TournamentGroup } from "@/hooks/useMultiRoundTournaments";
import { formatUSDT } from "@/lib/constants";

const ITEMS_PER_PAGE = 6;

const STATUS_STYLE = {
  live: {
    label: "LIVE",
    color: "#14b8a6",
    soft: "rgba(20,184,166,0.12)",
    border: "rgba(20,184,166,0.35)",
  },
  upcoming: {
    label: "UPCOMING",
    color: "#f59e0b",
    soft: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  completed: {
    label: "COMPLETED",
    color: "#94a3b8",
    soft: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.28)",
  },
} as const;

function formatTimeLeft(targetMs: number): string {
  const diff = targetMs - Date.now();
  if (diff <= 0) return "0m";
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | string> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | string> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("left-gap");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("right-gap");
  pages.push(totalPages);

  return pages;
}

function RoundDots({ rounds }: { rounds: TournamentGroup["rounds"] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {rounds.map((round, index) => {
        const isDone = round.status === "ended" || round.isSettled;
        const isLive = round.status === "live";
        const dotColor = isDone ? "#14b8a6" : isLive ? "#f59e0b" : "#334155";

        return (
          <div key={round.sessionId} className="flex items-center gap-1.5">
            <div
              className={`h-2.5 w-2.5 rounded-full ${isLive ? "animate-live-dot" : ""}`}
              style={{ backgroundColor: dotColor }}
              title={`Round ${round.roundNumber}`}
            />
            {index < rounds.length - 1 && (
              <div
                className="h-px w-4"
                style={{
                  backgroundColor: isDone ? "rgba(20,184,166,0.5)" : "rgba(100,116,139,0.4)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TournamentGroupCard({
  tournament,
  index,
}: {
  tournament: TournamentGroup;
  index: number;
}) {
  const statusStyle = STATUS_STYLE[tournament.status];
  const isLive = tournament.status === "live";
  const currentRound = tournament.currentRound;
  const completedLabel = `${tournament.completedRounds}/${tournament.totalRounds} rounds`;

  const timeInfo = useMemo(() => {
    if (tournament.status === "live" && currentRound) {
      return { label: "Ends In", value: formatTimeLeft(currentRound.endTimeMs) };
    }
    if (tournament.status === "upcoming" && currentRound) {
      return { label: "Starts In", value: formatTimeLeft(currentRound.startTimeMs) };
    }
    return { label: "Status", value: "Completed" };
  }, [tournament.status, currentRound]);

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-slate-950/85 shadow-[0_14px_34px_rgba(2,6,23,0.55)] transition-all duration-300 hover:-translate-y-1"
      style={{
        animationDelay: `${index * 70}ms`,
        borderColor: "rgba(71,85,105,0.45)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${statusStyle.color}, transparent)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${statusStyle.soft}, transparent 45%)`,
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-extrabold text-slate-100"
            style={{
              borderColor: statusStyle.border,
              backgroundColor: statusStyle.soft,
            }}
          >
            {tournament.coinSymbol.slice(0, 3)}
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-100">
              {tournament.coinSymbol}
              <span className="text-slate-400"> / USDT</span>
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
              Season {tournament.seasonId} • {tournament.totalRounds} rounds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <div className="h-2 w-2 rounded-full animate-live-dot" style={{ backgroundColor: "#14b8a6" }} />
          )}
          <span
            className="rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.12em]"
            style={{
              color: statusStyle.color,
              backgroundColor: statusStyle.soft,
              borderColor: statusStyle.border,
            }}
          >
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-800/70 px-5 pt-4">
        <div className="grid grid-cols-2 gap-y-3">
          {[
            { label: "Entry Fee", value: `${formatUSDT(tournament.entryFeeRaw)} USDT` },
            { label: "Prize Pool", value: `${formatUSDT(tournament.totalPrizePoolRaw)} USDT` },
            { label: "Progress", value: completedLabel },
            timeInfo,
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-slate-200">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Round Progress</p>
        <RoundDots rounds={tournament.rounds} />
        {currentRound && tournament.status !== "completed" && (
          <p className="mt-2 text-[11px] font-semibold text-slate-400">
            {tournament.status === "live"
              ? `Round ${currentRound.roundNumber} is currently live`
              : `Round ${currentRound.roundNumber} starts in ${formatTimeLeft(currentRound.startTimeMs)}`}
          </p>
        )}
      </div>

      <div className="mt-auto px-5 pb-5">
        <Link
          href={`/tournaments/${tournament.seasonId}`}
          className="block rounded-xl py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] transition-all duration-200 hover:opacity-90"
          style={
            isLive
              ? {
                  backgroundColor: "#14b8a6",
                  color: "#042f2e",
                }
              : tournament.status === "upcoming"
              ? {
                  backgroundColor: "rgba(245,158,11,0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245,158,11,0.35)",
                }
              : {
                  backgroundColor: "rgba(148,163,184,0.1)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(148,163,184,0.28)",
                }
          }
        >
          {isLive ? "Predict Now" : tournament.status === "upcoming" ? "View Details" : "View Results"}
        </Link>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-lg animate-shimmer" />
            <div className="h-3 w-1/2 rounded-lg animate-shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-10 rounded-lg animate-shimmer" />
          ))}
        </div>
        <div className="h-10 rounded-lg animate-shimmer" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tint,
  delay = 0,
}: {
  label: string;
  value: string | number;
  tint: string;
  delay?: number;
}) {
  return (
    <div
      className="animate-card-enter rounded-2xl border border-slate-800/80 bg-slate-950/75 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold" style={{ color: tint }}>
        {value}
      </p>
    </div>
  );
}

export default function TournamentsPage() {
  const tournamentsQuery = useMultiRoundTournaments();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "upcoming" | "completed">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const tournaments = useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data]);

  const filteredTournaments = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return tournaments.filter((tournament) => {
      const statusMatch = statusFilter === "all" || tournament.status === statusFilter;
      const searchMatch =
        normalized.length === 0 ||
        tournament.coinSymbol.toLowerCase().includes(normalized) ||
        String(tournament.seasonId).includes(normalized);
      return statusMatch && searchMatch;
    });
  }, [tournaments, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTournaments.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedTournaments = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return filteredTournaments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTournaments, activePage]);

  const paginationItems = useMemo(
    () => getPaginationItems(activePage, totalPages),
    [activePage, totalPages],
  );

  const stats = useMemo(() => {
    const live = tournaments.filter((t) => t.status === "live").length;
    const upcoming = tournaments.filter((t) => t.status === "upcoming").length;
    const completed = tournaments.filter((t) => t.status === "completed").length;
    const totalRounds = tournaments.reduce((sum, t) => sum + t.totalRounds, 0);
    return { total: tournaments.length, live, upcoming, completed, totalRounds };
  }, [tournaments]);

  const rangeStart = filteredTournaments.length === 0 ? 0 : (activePage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(activePage * ITEMS_PER_PAGE, filteredTournaments.length);

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 10% 10%, rgba(20,184,166,0.14), transparent 30%), radial-gradient(circle at 85% 15%, rgba(14,165,233,0.14), transparent 34%), linear-gradient(180deg, #020617 0%, #020617 45%, #0b1120 100%)",
          }}
        />
        <div className="blue-cyber-grid absolute inset-0 opacity-25" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8">
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-300">
              On-Chain Tournaments
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-400">
                {mounted ? new Date().toLocaleTimeString() : "--:--:--"}
              </span>
              <button
                type="button"
                onClick={() => tournamentsQuery.refetch()}
                className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400/55 hover:bg-cyan-500/15"
              >
                Refresh
              </button>
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Tournament Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Track multi-round prediction seasons, monitor live sessions, and review results with a cleaner and
            faster browsing flow.
          </p>
        </section>

        <section className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Tournaments" value={stats.total} tint="#67e8f9" delay={0} />
          <StatCard label="Live" value={stats.live} tint="#14b8a6" delay={60} />
          <StatCard label="Upcoming" value={stats.upcoming} tint="#f59e0b" delay={120} />
          <StatCard label="Completed" value={stats.completed} tint="#cbd5e1" delay={180} />
          <StatCard label="Total Rounds" value={stats.totalRounds} tint="#38bdf8" delay={240} />
        </section>

        <section className="mb-7 rounded-2xl border border-slate-800/80 bg-slate-900/65 p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "live", "upcoming", "completed"] as const).map((status) => {
                const isActive = statusFilter === status;
                const activeTint =
                  status === "all"
                    ? "#67e8f9"
                    : status === "live"
                      ? "#14b8a6"
                      : status === "upcoming"
                        ? "#f59e0b"
                        : "#cbd5e1";
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition"
                    style={
                      isActive
                        ? {
                            color: activeTint,
                            borderColor: `${activeTint}66`,
                            backgroundColor: `${activeTint}1a`,
                          }
                        : {
                            color: "#94a3b8",
                            borderColor: "rgba(100,116,139,0.35)",
                            backgroundColor: "rgba(15,23,42,0.6)",
                          }
                    }
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <span
                className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-500"
              >
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search coin or season..."
                className="form-field-glow w-full rounded-xl border border-slate-700/80 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none md:w-72"
              />
            </div>
          </div>
        </section>

        {tournamentsQuery.isLoading && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </section>
        )}

        {tournamentsQuery.isError && (
          <section className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-5 text-sm font-semibold text-rose-200">
            Failed to load tournaments:{" "}
            {tournamentsQuery.error instanceof Error ? tournamentsQuery.error.message : "Unknown error"}
          </section>
        )}

        {!tournamentsQuery.isLoading && !tournamentsQuery.isError && filteredTournaments.length === 0 && (
          <section className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-500/10">
              <span className="material-symbols-outlined text-3xl text-teal-300">emoji_events</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100">No tournaments found</h3>
            <p className="mt-2 text-sm text-slate-400">
              {search || statusFilter !== "all"
                ? "Try adjusting your search keyword or filters."
                : "No multi-round tournaments have been created yet."}
            </p>
            <Link
              href="/arena"
              className="mt-6 inline-flex rounded-xl border border-teal-400/40 bg-teal-500/15 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-teal-200 transition hover:bg-teal-500/25"
            >
              Create Tournament
            </Link>
          </section>
        )}

        {!tournamentsQuery.isLoading && !tournamentsQuery.isError && filteredTournaments.length > 0 && (
          <>
            <section className="mb-4 flex flex-col gap-2 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>
                Showing <span className="font-semibold text-slate-200">{rangeStart}</span>-
                <span className="font-semibold text-slate-200">{rangeEnd}</span> of{" "}
                <span className="font-semibold text-slate-200">{filteredTournaments.length}</span> tournaments
              </p>
              <p className="text-xs text-slate-500">6 items per page</p>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedTournaments.map((tournament, index) => (
                <TournamentGroupCard key={tournament.seasonId} tournament={tournament} index={index} />
              ))}
            </section>

            {totalPages > 1 && (
              <section className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                  disabled={activePage === 1}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:border-slate-500 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>

                {paginationItems.map((item, index) => {
                  if (typeof item !== "number") {
                    return (
                      <span key={`${item}-${index}`} className="px-1 text-slate-500">
                        ...
                      </span>
                    );
                  }

                  const isActive = item === activePage;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className="h-9 min-w-9 rounded-lg border text-xs font-semibold transition"
                      style={
                        isActive
                          ? {
                              color: "#67e8f9",
                              borderColor: "rgba(103,232,249,0.55)",
                              backgroundColor: "rgba(103,232,249,0.14)",
                            }
                          : {
                              color: "#cbd5e1",
                              borderColor: "rgba(100,116,139,0.4)",
                              backgroundColor: "rgba(15,23,42,0.7)",
                            }
                      }
                    >
                      {item}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
                  disabled={activePage === totalPages}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:border-slate-500 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
