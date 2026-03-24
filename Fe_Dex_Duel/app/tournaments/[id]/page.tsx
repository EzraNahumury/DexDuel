"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ConnectButton, useCurrentAccount } from "@onelabs/dapp-kit";
import { useJoinGame } from "@/hooks/useJoinGame";
import { useClaimRefund } from "@/hooks/useClaimRefund";
import { useClaimReward } from "@/hooks/useClaimReward";
import {
  toFinnhubSymbol,
  useMarketCandles,
  useMarketQuote,
} from "@/hooks/useMarketData";
import {
  useOnChainTournaments,
  useRoundJoinEvents,
  type JoinGameEvent,
  type OnChainTournament,
} from "@/hooks/useOnChainTournaments";
import { useLeaderboardRows } from "@/hooks/useLeaderboard";
import { useUSDTBalance } from "@/hooks/useUSDTBalance";
import { buildTournamentGroup, type TournamentGroup } from "@/lib/tournamentGroup";
import {
  DIRECTION,
  EXPLORER_BASE,
  formatUSDT,
  shortenAddress,
} from "@/lib/constants";
import { FaucetButton } from "@/components/FaucetButton";
import { CandlestickChart } from "@/components/CandlestickChart";
import { CryptoIcon3D } from "@/components/CryptoIcon3D";

type PickDirection = 1 | 2;

function formatDateTime(ts: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function formatTimeLeft(targetMs: number): string {
  const diff = targetMs - Date.now();
  if (diff <= 0) return "0m";
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  const secs = Math.floor((diff % 60_000) / 1000);
  if (totalMinutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}

function formatDirection(d: number) {
  return d === DIRECTION.DOWN ? "DOWN" : "UP";
}

/* ─── Countdown display ──────────────────────────────────────────── */
function Countdown({ targetMs, label }: { targetMs: number; label: string }) {
  const [left, setLeft] = useState(() => formatTimeLeft(targetMs));
  useEffect(() => {
    const t = setInterval(() => setLeft(formatTimeLeft(targetMs)), 1000);
    return () => clearInterval(t);
  }, [targetMs]);
  return (
    <div className="text-center">
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
      <p
        className="text-3xl font-black animate-timer tabular-nums"
        style={{ color: "#0df280", fontVariantNumeric: "tabular-nums" }}
      >
        {left}
      </p>
    </div>
  );
}

/* ─── Round timeline ─────────────────────────────────────────────── */
function RoundTimeline({
  rounds,
  activeRound,
  onSelect,
  selectedRoundId,
}: {
  rounds: OnChainTournament[];
  activeRound: OnChainTournament | null;
  onSelect: (r: OnChainTournament) => void;
  selectedRoundId: string | null;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {rounds.map((r, i) => {
        const isDone = r.status === "ended" || r.isSettled;
        const isLive = r.status === "live";
        const isSelected = selectedRoundId === r.sessionId;
        const dotColor = isDone ? "#0df280" : isLive ? "#f59e0b" : "#334155";
        const label = `R${r.roundNumber ?? i + 1}`;
        return (
          <div key={r.sessionId} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(r)}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${isLive ? "animate-live-dot" : ""}`}
                style={{
                  backgroundColor: isSelected
                    ? dotColor
                    : isDone
                    ? "rgba(13,242,128,0.15)"
                    : isLive
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(255,255,255,0.05)",
                  border: `2px solid ${dotColor}`,
                  color: isSelected ? "#0a0a0a" : dotColor,
                  boxShadow: isSelected ? `0 0 12px ${dotColor}60` : "none",
                }}
              >
                {isDone ? "✓" : label}
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: isLive ? "#f59e0b" : isDone ? "#0df280" : "#475569" }}
              >
                {isLive ? "LIVE" : isDone ? "DONE" : "WAIT"}
              </span>
            </button>
            {i < rounds.length - 1 && (
              <div
                className="w-6 h-px shrink-0"
                style={{
                  backgroundColor: isDone ? "rgba(13,242,128,0.4)" : "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Per-tournament round winner resolver ───────────────────────── */
function useTournamentRoundWinners(tournament: TournamentGroup | null) {
  const endedRounds = useMemo(
    () =>
      (tournament?.rounds ?? []).filter(
        (r) => (r.status === "ended" || r.isSettled) && r.endTimeMs > 0,
      ),
    [tournament],
  );

  return useQuery({
    queryKey: [
      "tournament-winners",
      tournament?.seasonId ?? 0,
      endedRounds.map((r) => `${r.roundNumber}:${r.winnerDirection}`).join(","),
    ],
    queryFn: async () => {
      const winners = new Map<number, 1 | 2>();

      // Use on-chain winner where available
      for (const r of tournament?.rounds ?? []) {
        if (r.winnerDirection === 1 || r.winnerDirection === 2) {
          winners.set(r.roundNumber, r.winnerDirection as 1 | 2);
        }
      }

      // Derive from price for unsettled ended rounds — use /api/rounds/price (same as Round History)
      const needsDerive = endedRounds.filter(
        (r) => r.winnerDirection === 0 && r.priceStart > 0,
      );
      await Promise.all(
        needsDerive.map(async (round) => {
          const symbol = toFinnhubSymbol(round.coinSymbol);
          const params = new URLSearchParams({
            roundObjectId: round.roundObjectId,
            symbol,
            coinSymbol: round.coinSymbol,
            endTimeMs: String(round.endTimeMs),
            priceStart: String(round.priceStart),
          });
          try {
            const res = await fetch(`/api/rounds/price?${params}`);
            if (!res.ok) return;
            const data: { priceEnd: number | null; winnerDir: number } = await res.json();
            if (data.winnerDir === 1 || data.winnerDir === 2) {
              winners.set(round.roundNumber, data.winnerDir as 1 | 2);
            }
          } catch { /* ignore */ }
        }),
      );

      return winners;
    },
    enabled: endedRounds.length > 0,
    // Keep retrying every 15s until all ended rounds have confirmed winners
    refetchInterval: (q) => {
      const winners = q.state.data;
      if (!winners) return 15_000;
      const allResolved = endedRounds.every(
        (r) => r.winnerDirection !== 0 || winners.has(r.roundNumber),
      );
      return allResolved ? false : 15_000;
    },
    staleTime: 5_000,
  });
}

/* ─── Tournament live leaderboard ────────────────────────────────── */
function TournamentLiveLeaderboard({
  tournament,
  allEvents,
}: {
  tournament: TournamentGroup;
  allEvents: JoinGameEvent[];
}) {
  // Settled / ended round winners (historical price derived)
  const roundWinnersQuery = useTournamentRoundWinners(tournament);
  const savedWinners = roundWinnersQuery.data ?? new Map<number, 1 | 2>();

  // Live price — refreshes every 1 second
  const quoteQuery = useMarketQuote(toFinnhubSymbol(tournament.coinSymbol));
  const currentPriceUsd = quoteQuery.data?.c ?? null;

  // Local timer to detect when a round's endTimeMs passes
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cache last-known live direction so transition live→ended is seamless
  const liveDirectionCache = useRef(new Map<number, 1 | 2>());

  const sortedRounds = useMemo(
    () => [...tournament.rounds].sort((a, b) => a.startTimeMs - b.startTimeMs),
    [tournament.rounds],
  );

  // Merged winner map: confirmed > cached-live > nothing
  const roundWinners = useMemo(() => {
    const merged = new Map(savedWinners);

    for (const round of tournament.rounds) {
      if (merged.has(round.roundNumber)) continue; // already confirmed

      const isLocallyLive =
        round.status === "live" ||
        (round.status === "upcoming" && round.startTimeMs > 0 && nowMs >= round.startTimeMs && nowMs < round.endTimeMs);
      const isLocallyEnded =
        round.status === "ended" ||
        round.isSettled ||
        (round.endTimeMs > 0 && nowMs >= round.endTimeMs);

      if (isLocallyLive && round.priceStart > 0 && currentPriceUsd !== null) {
        const startUsd = round.priceStart / 1e8;
        const dir: 1 | 2 = currentPriceUsd >= startUsd ? 1 : 2;
        liveDirectionCache.current.set(round.roundNumber, dir);
        merged.set(round.roundNumber, dir);
      } else if (isLocallyEnded && round.priceStart > 0) {
        // Round just ended — prefer cached snapshot (frozen direction)
        const cached = liveDirectionCache.current.get(round.roundNumber);
        if (cached) {
          merged.set(round.roundNumber, cached);
        } else if (currentPriceUsd !== null) {
          // Fallback: use current price only within 3 min of end (Finnhub indexing delay)
          // Cache it immediately so the result is frozen even as live price moves
          const justEnded = round.endTimeMs > 0 && nowMs - round.endTimeMs < 3 * 60 * 1000;
          if (justEnded) {
            const startUsd = round.priceStart / 1e8;
            const dir: 1 | 2 = currentPriceUsd > startUsd ? 1 : 2;
            liveDirectionCache.current.set(round.roundNumber, dir); // freeze it
            merged.set(round.roundNumber, dir);
          }
        }
      }
    }

    return merged;
  }, [savedWinners, currentPriceUsd, tournament.rounds, nowMs]);

  const tournamentSessionIds = useMemo(
    () => new Set(tournament.rounds.map((r) => r.sessionId)),
    [tournament.rounds],
  );

  const tournamentRoundNumbers = useMemo(
    () => new Set(tournament.rounds.map((r) => r.roundNumber)),
    [tournament.rounds],
  );

  const tournamentEvents = useMemo(
    () => allEvents.filter((e) =>
      e.sessionId ? tournamentSessionIds.has(e.sessionId) : tournamentRoundNumbers.has(e.roundNumber)
    ),
    [allEvents, tournamentSessionIds, tournamentRoundNumbers],
  );

  // Only show round columns that have at least one prediction event
  const activeRounds = useMemo(() => {
    const roundsWithEvents = new Set(tournamentEvents.map((e) => e.roundNumber));
    return sortedRounds.filter((r) => roundsWithEvents.has(r.roundNumber));
  }, [sortedRounds, tournamentEvents]);

  const leaderboard = useMemo(() => {
    const playerMap = new Map<
      string,
      {
        wins: number;
        total: number;
        roundResults: Map<number, "won" | "lost" | "pending">;
        roundDirections: Map<number, 1 | 2>;
      }
    >();

    for (const event of tournamentEvents) {
      const entry = playerMap.get(event.player) ?? {
        wins: 0,
        total: 0,
        roundResults: new Map<number, "won" | "lost" | "pending">(),
        roundDirections: new Map<number, 1 | 2>(),
      };
      const winDir = roundWinners.get(event.roundNumber);
      const outcome: "won" | "lost" | "pending" = winDir
        ? event.direction === winDir
          ? "won"
          : "lost"
        : "pending";
      entry.total++;
      if (outcome === "won") entry.wins++;
      entry.roundResults.set(event.roundNumber, outcome);
      entry.roundDirections.set(event.roundNumber, event.direction);
      playerMap.set(event.player, entry);
    }

    return Array.from(playerMap.entries())
      .map(([player, data]) => ({
        player,
        wins: data.wins,
        total: data.total,
        roundResults: data.roundResults,
        roundDirections: data.roundDirections,
      }))
      .sort((a, b) => b.wins - a.wins || b.total - a.total);
  }, [tournamentEvents, roundWinners]);

  // Rounds that have a resolved winner (on-chain OR derived from price API)
  const confirmedRoundSet = useMemo(
    () => {
      const set = new Set<number>();
      for (const r of tournament.rounds) {
        if (r.winnerDirection !== 0) set.add(r.roundNumber);
      }
      // Also include rounds with derived winners from price API
      for (const [roundNumber] of roundWinners) {
        set.add(roundNumber);
      }
      return set;
    },
    [tournament.rounds, roundWinners],
  );

  const hasLive = tournament.rounds.some(
    (r) => r.status === "live" || (r.endTimeMs > 0 && nowMs < r.endTimeMs && r.status !== "ended" && !r.isSettled),
  );

  return (
    <div
      className="glass-panel rounded-2xl p-5"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ color: "#facc15" }}>
            emoji_events
          </span>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            Tournament Leaderboard
          </p>
        </div>
        {hasLive && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-live-dot"
              style={{ backgroundColor: "#0df280" }}
            />
            <span className="text-[9px] font-black" style={{ color: "#0df280" }}>
              Live · {currentPriceUsd != null ? `$${currentPriceUsd.toLocaleString()}` : "…"}
            </span>
          </div>
        )}
      </div>

      {/* Round column headers */}
      {leaderboard.length > 0 && (
        <div className="flex items-center gap-1 mb-2 px-2">
          <div className="flex-1" />
          {activeRounds.map((r, rIdx) => {
            const winDir = roundWinners.get(r.roundNumber);
            const isLive = !r.isSettled && r.status === "live";
            const dirColor = winDir === DIRECTION.UP ? "#22c55e" : "#ef4444";
            return (
              <div key={r.roundNumber} className="w-8 text-center">
                <p className="text-[8px] text-slate-600 font-black leading-none mb-0.5">
                  R{rIdx + 1}
                </p>
                {winDir ? (
                  <p
                    className={`text-[11px] font-black leading-none${isLive ? " animate-pulse" : ""}`}
                    style={{ color: dirColor }}
                  >
                    {winDir === DIRECTION.UP ? "▲" : "▼"}
                  </p>
                ) : (
                  <p className="text-[8px] text-slate-800 leading-none">—</p>
                )}
              </div>
            );
          })}
          <div className="w-10" />
        </div>
      )}

      {/* Rows */}
      {leaderboard.length === 0 ? (
        <p className="text-[11px] text-slate-600 font-bold italic">
          No predictions yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {leaderboard.map((entry, idx) => {
            const rankColor =
              idx === 0
                ? "#facc15"
                : idx === 1
                  ? "#cbd5e1"
                  : idx === 2
                    ? "#c2410c"
                    : "#64748b";
            return (
              <div
                key={entry.player}
                className="flex items-center gap-1 px-2 py-2 rounded-lg animate-row-enter"
                style={{
                  backgroundColor:
                    idx < 3 ? `${rankColor}08` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${idx < 3 ? `${rankColor}18` : "rgba(255,255,255,0.04)"}`,
                  animationDelay: `${idx * 30}ms`,
                }}
              >
                <span
                  className="text-[9px] font-black w-5 shrink-0 text-center"
                  style={{ color: rankColor }}
                >
                  #{idx + 1}
                </span>
                <span className="text-[10px] font-bold text-slate-300 flex-1 truncate min-w-0">
                  {shortenAddress(entry.player, 4)}
                </span>
                {/* Per-round result icons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {activeRounds.map((r) => {
                    const isConfirmed = confirmedRoundSet.has(r.roundNumber);
                    const result = entry.roundResults.get(r.roundNumber);
                    const predictedDir = entry.roundDirections.get(r.roundNumber);
                    const isLive = !r.isSettled && r.status === "live";
                    return (
                      <div key={r.roundNumber} className="w-8 flex justify-center">
                        {result === undefined ? (
                          <span className="text-[9px] text-slate-800">—</span>
                        ) : !isConfirmed ? (
                          /* Round not settled on-chain — always show predicted direction */
                          <span
                            className="text-[10px] font-black"
                            style={{ color: predictedDir === DIRECTION.UP ? "#3b82f6" : predictedDir === DIRECTION.DOWN ? "#a78bfa" : "#64748b" }}
                          >
                            {predictedDir === DIRECTION.UP ? "▲" : predictedDir === DIRECTION.DOWN ? "▼" : "…"}
                          </span>
                        ) : result === "won" ? (
                          <span
                            className={`text-[11px] font-black${isLive ? " animate-pulse" : ""}`}
                            style={{ color: "#22c55e" }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-black${isLive ? " animate-pulse" : ""}`}
                            style={{ color: "#ef4444" }}
                          >
                            ✗
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Wins/total */}
                <span
                  className="text-[11px] font-black w-10 text-right shrink-0"
                  style={{ color: rankColor }}
                >
                  {entry.wins}/{entry.total}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Round history accordion item ──────────────────────────────── */
function RoundHistoryItem({
  round,
  roundIndex,
  autoOpen = false,
}: {
  round: OnChainTournament;
  roundIndex: number;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const joinEventsQuery = useRoundJoinEvents();
  const allEvents = useMemo(
    () => (joinEventsQuery.data ?? []).filter((e) =>
      e.sessionId ? e.sessionId === round.sessionId : e.roundNumber === round.roundNumber
    ),
    [joinEventsQuery.data, round.sessionId, round.roundNumber],
  );

  const isDone = round.status === "ended" || round.isSettled;

  const finnhubSymbol = toFinnhubSymbol(round.coinSymbol);

  // If contract already stores price_end on-chain, use it directly (no API call needed)
  const onChainEndPriceUsd = round.priceEnd > 0 ? round.priceEnd / 1e8 : null;

  // Fetch end price from DB (persisted) or Finnhub server-side — only when on-chain price is absent
  const endPriceQuery = useQuery({
    queryKey: ["round-end-price", round.roundObjectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        roundObjectId: round.roundObjectId,
        symbol: finnhubSymbol,
        coinSymbol: round.coinSymbol,
        endTimeMs: String(round.endTimeMs),
        priceStart: String(round.priceStart),
      });
      const res = await fetch(`/api/rounds/price?${params}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ priceEnd: number | null; winnerDir: number; source: string }>;
    },
    // Skip the fetch if we already have an on-chain price
    enabled: isDone && round.endTimeMs > 0 && onChainEndPriceUsd === null,
    staleTime: (q) => (q.state.data?.priceEnd != null ? 60 * 60 * 1000 : 20_000),
    refetchInterval: (q) => (q.state.data?.priceEnd != null ? false : 20_000),
    retry: 3,
  });

  // Early return after all hooks
  if (!isDone) return null;

  // Prefer on-chain price → DB/Finnhub price → null
  const endPriceUsd: number | null = onChainEndPriceUsd ?? endPriceQuery.data?.priceEnd ?? null;

  const startPriceUsd = round.priceStart > 0 ? round.priceStart / 1e8 : null;

  const derivedWinDir = useMemo(() => {
    if (round.winnerDirection !== 0) return round.winnerDirection;
    // Derive from on-chain price_end if available
    if (onChainEndPriceUsd !== null && startPriceUsd !== null) {
      return onChainEndPriceUsd > startPriceUsd ? DIRECTION.UP : DIRECTION.DOWN;
    }
    if (endPriceQuery.data?.winnerDir) return endPriceQuery.data.winnerDir;
    if (!endPriceUsd || !startPriceUsd) return 0;
    return endPriceUsd > startPriceUsd ? DIRECTION.UP : DIRECTION.DOWN;
  }, [round.winnerDirection, onChainEndPriceUsd, endPriceQuery.data, endPriceUsd, startPriceUsd]);

  const isEstimated = round.winnerDirection === 0 && derivedWinDir !== 0;

  const winDir = derivedWinDir;
  const winColor = winDir === DIRECTION.UP ? "#22c55e" : winDir === DIRECTION.DOWN ? "#ef4444" : "#94a3b8";

  const correctPredictors = allEvents
    .filter((e) => e.direction === winDir)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  const startPrice = startPriceUsd != null ? `$${startPriceUsd.toFixed(2)}` : "N/A";
  const endPrice = endPriceUsd != null ? `$${endPriceUsd.toFixed(2)}` : null;
  const isPrizeRound = round.entryFeeRaw > 1;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
            style={{ backgroundColor: "rgba(13,242,128,0.1)", color: "#0df280" }}
          >
            ✓
          </div>
          <div>
            <span className="text-xs font-black text-slate-200">
              Round {roundIndex}
              {isPrizeRound && (
                <span
                  className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-black"
                  style={{ backgroundColor: "rgba(250,204,21,0.15)", color: "#facc15" }}
                >
                  PRIZE ROUND
                </span>
              )}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {formatDateTime(round.startTimeMs)} · {startPrice}
              {endPriceQuery.isLoading ? (
                <span className="animate-pulse"> → …</span>
              ) : endPrice ? (
                <span> → <span style={{ color: winDir === DIRECTION.UP ? "#22c55e" : winDir === DIRECTION.DOWN ? "#ef4444" : "#94a3b8" }}>{endPrice}</span></span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {winDir !== 0 ? (
            <span
              className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{
                color: winColor,
                backgroundColor: `${winColor}18`,
                border: `1px solid ${winColor}30`,
              }}
            >
              {winDir === DIRECTION.UP ? "▲" : "▼"} {winDir === DIRECTION.UP ? "UP" : "DOWN"} WON
            </span>
          ) : (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ color: "#64748b", backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              Fetching result…
            </span>
          )}
          <span className="material-symbols-outlined text-sm text-slate-500">
            {open ? "expand_less" : "expand_more"}
          </span>
        </div>
      </button>

      {open && (
        <div
          className="px-4 pb-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >

          {/* ── Loading end price ── */}
          {winDir === 0 && endPriceQuery.isLoading && (
            <div className="mt-3 mb-4 h-16 rounded-xl animate-shimmer" />
          )}

          {/* ── Result banner ── */}
          {winDir !== 0 && (
            <div
              className="mt-3 mb-4 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
              style={{
                backgroundColor: winDir === DIRECTION.UP
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
                border: `1px solid ${winColor}25`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shrink-0"
                  style={{ backgroundColor: `${winColor}15`, color: winColor }}
                >
                  {winDir === DIRECTION.UP ? "▲" : "▼"}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      Winner
                    </p>
                    {isEstimated && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-black"
                        style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)" }}
                      >
                        estimated
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-black" style={{ color: winColor }}>
                    {winDir === DIRECTION.UP ? "▲ UP" : "▼ DOWN"} WON
                  </p>
                </div>
              </div>

              {/* Price comparison */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Start</p>
                  <p className="text-sm font-black text-slate-200">{startPrice}</p>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-lg font-black" style={{ color: winColor }}>
                    {winDir === DIRECTION.UP ? "↑" : "↓"}
                  </span>
                  {endPrice && startPriceUsd && (
                    <span
                      className="text-[9px] font-black"
                      style={{ color: winColor }}
                    >
                      {winDir === DIRECTION.UP
                        ? `+$${(endPriceUsd! - startPriceUsd).toFixed(2)}`
                        : `-$${(startPriceUsd - endPriceUsd!).toFixed(2)}`}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">End</p>
                  <p className="text-sm font-black text-slate-200">
                    {endPrice ?? (endPriceQuery.isLoading ? "…" : "N/A")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-3 mb-4">
            <div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Pool</p>
              <p className="text-sm font-black text-slate-200">{formatUSDT(round.totalPoolRaw)} USDT</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Net Prize</p>
              <p className="text-sm font-black" style={{ color: "#0df280" }}>
                {formatUSDT(round.isSettled ? round.finalPrizePool : Math.floor(round.yieldPoolRaw * 0.9))} USDT
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Participants</p>
              <p className="text-sm font-black text-slate-200">{round.totalParticipants}</p>
            </div>
          </div>

          {correctPredictors.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">
                Correct Predictors ({winDir === DIRECTION.UP ? "UP ↑" : "DOWN ↓"})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {correctPredictors.slice(0, 10).map((e, idx) => (
                  <div
                    key={e.txDigest}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] font-black w-5 text-center"
                        style={{ color: idx === 0 ? "#facc15" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#c2410c" : "#64748b" }}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-300">{shortenAddress(e.player)}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(e.timestampMs).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {winDir === 0 && !endPriceQuery.isLoading && endPriceUsd == null && (
            <p className="text-[10px] text-slate-500 font-bold italic animate-pulse">
              Fetching price data…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar round history card ─────────────────────────────────── */
function RoundHistorySidebar({
  round,
  roundIndex,
  allJoinEvents,
  livePrice,
}: {
  round: OnChainTournament;
  roundIndex: number;
  allJoinEvents: JoinGameEvent[];
  livePrice: number | null;
}) {
  const finnhubSymbol = toFinnhubSymbol(round.coinSymbol);
  const onChainEndPriceUsd = round.priceEnd > 0 ? round.priceEnd / 1e8 : null;

  // Fetch end price from API when on-chain price is absent
  const endPriceQuery = useQuery({
    queryKey: ["round-end-price", round.roundObjectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        roundObjectId: round.roundObjectId,
        symbol: finnhubSymbol,
        coinSymbol: round.coinSymbol,
        endTimeMs: String(round.endTimeMs),
        priceStart: String(round.priceStart),
      });
      const res = await fetch(`/api/rounds/price?${params}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ priceEnd: number | null; winnerDir: number; source: string }>;
    },
    enabled: (round.status === "ended" || round.isSettled) && round.endTimeMs > 0 && onChainEndPriceUsd === null,
    staleTime: (q) => (q.state.data?.priceEnd != null ? 60 * 60 * 1000 : 20_000),
    refetchInterval: (q) => (q.state.data?.priceEnd != null ? false : 20_000),
    retry: 3,
  });

  const isDone = round.status === "ended" || round.isSettled;
  if (!isDone) return null;

  const startUsd = round.priceStart > 0 ? round.priceStart / 1e8 : null;
  // Fallback chain: on-chain > API > live price
  const endUsd: number | null = onChainEndPriceUsd ?? endPriceQuery.data?.priceEnd ?? livePrice;
  const isPrize = round.entryFeeRaw > 1;

  // Determine winner: on-chain > API > derived from prices
  const wDir = round.winnerDirection !== 0
    ? round.winnerDirection
    : endPriceQuery.data?.winnerDir
    ? endPriceQuery.data.winnerDir
    : (endUsd && startUsd) ? (endUsd > startUsd ? 1 : 2) : 0;
  const wColor = wDir === 1 ? "#22c55e" : wDir === 2 ? "#ef4444" : "#94a3b8";

  const roundEvents = allJoinEvents.filter((e) =>
    e.sessionId ? e.sessionId === round.sessionId : e.roundNumber === round.roundNumber
  );
  const correctPredictors = wDir !== 0
    ? roundEvents.filter((e) => e.direction === wDir).sort((a, b) => a.timestampMs - b.timestampMs)
    : [];

  const isLoading = endUsd === null && endPriceQuery.isLoading;

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        backgroundColor: "rgba(255,255,255,0.025)",
        border: `1px solid ${wDir !== 0 ? `${wColor}20` : "rgba(255,255,255,0.05)"}`,
      }}
    >
      {/* Header: round name + result badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
            style={{ backgroundColor: "rgba(13,242,128,0.12)", color: "#0df280" }}
          >
            ✓
          </div>
          <span className="text-[11px] font-black text-slate-200">R{roundIndex}</span>
          {isPrize && (
            <span
              className="text-[7px] px-1 py-0.5 rounded font-black"
              style={{ backgroundColor: "rgba(250,204,21,0.15)", color: "#facc15" }}
            >
              PRIZE
            </span>
          )}
        </div>
        {isLoading ? (
          <span className="text-[9px] text-slate-600 italic animate-pulse">loading…</span>
        ) : wDir !== 0 ? (
          <span
            className="text-[9px] font-black px-2 py-0.5 rounded-full"
            style={{ color: wColor, backgroundColor: `${wColor}18`, border: `1px solid ${wColor}30` }}
          >
            {wDir === 1 ? "▲ UP" : "▼ DOWN"}
          </span>
        ) : (
          <span className="text-[9px] text-slate-600 italic animate-pulse">fetching…</span>
        )}
      </div>

      {/* Prices */}
      <div className="flex items-center justify-between text-[10px]">
        <div>
          <span className="text-slate-500">Start: </span>
          <span className="font-bold text-slate-300">
            {startUsd != null ? `$${startUsd.toFixed(2)}` : "N/A"}
          </span>
        </div>
        <span className="font-black" style={{ color: wColor }}>→</span>
        <div>
          <span className="text-slate-500">End: </span>
          {isLoading ? (
            <span className="font-bold text-slate-600 animate-pulse">loading…</span>
          ) : (
            <span className="font-bold" style={{ color: endUsd != null ? wColor : "#64748b" }}>
              {endUsd != null ? `$${endUsd.toFixed(2)}` : "N/A"}
            </span>
          )}
        </div>
      </div>

      {/* Correct predictors */}
      {!isLoading && correctPredictors.length > 0 && (
        <div>
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">
            Correct ({correctPredictors.length})
          </p>
          <div className="space-y-0.5">
            {correctPredictors.slice(0, 5).map((e, idx) => (
              <div
                key={e.txDigest}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <span
                  className="font-black w-4 text-center"
                  style={{ color: idx === 0 ? "#facc15" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#c2410c" : "#64748b" }}
                >
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-400 truncate">
                  {shortenAddress(e.player, 4)}
                </span>
              </div>
            ))}
            {correctPredictors.length > 5 && (
              <p className="text-[9px] text-slate-600 italic">
                +{correctPredictors.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
      {!isLoading && wDir !== 0 && correctPredictors.length === 0 && (
        <p className="text-[9px] text-slate-600 italic">No correct predictions</p>
      )}
    </div>
  );
}

/* ─── Active round predict panel ─────────────────────────────────── */
function ActiveRoundPanel({
  round,
  tournament,
  account,
}: {
  round: OnChainTournament;
  tournament: TournamentGroup;
  account: ReturnType<typeof useCurrentAccount>;
}) {
  const { balance, refetch: refetchBalance } = useUSDTBalance(account?.address);
  const { joinGame, isPending: isJoinPending } = useJoinGame();
  const joinEventsQuery = useRoundJoinEvents();

  const [selectedDirection, setSelectedDirection] = useState<PickDirection | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const allEvents = useMemo(
    () => (joinEventsQuery.data ?? []).filter((e) =>
      e.sessionId ? e.sessionId === round.sessionId : e.roundNumber === round.roundNumber
    ),
    [joinEventsQuery.data, round.sessionId, round.roundNumber],
  );
  const userJoinEvent = useMemo(
    () => allEvents.find((e) => e.player.toLowerCase() === (account?.address ?? "").toLowerCase()),
    [allEvents, account?.address],
  );
  const userParticipated = !!userJoinEvent;

  const isPrizeRound = round.entryFeeRaw > 1;
  const isFreeRound = round.entryFeeRaw <= 1;
  const isLive = round.status === "live";
  const total = round.upCount + round.downCount;
  const upPct = total > 0 ? Math.round((round.upCount / total) * 100) : 50;

  const hasEnoughBalance = balance ? balance.raw >= BigInt(round.entryFeeRaw) : false;
  const canSubmit =
    Boolean(account) &&
    isLive &&
    Boolean(selectedDirection) &&
    Boolean(balance?.largestCoin) &&
    hasEnoughBalance &&
    !isJoinPending &&
    !userParticipated;

  async function handleSubmitPrediction() {
    if (!account || !selectedDirection || !balance?.largestCoin) return;
    setSubmitError(null);
    try {
      const result = await joinGame({
        sessionId: round.sessionId,
        roundId: round.roundObjectId,
        registryId: round.registryId,
        direction: selectedDirection,
        usdtCoinObjectId: balance.largestCoin.coinObjectId,
        entryFeeRaw: round.entryFeeRaw,
      });
      setTxDigest(result.digest ?? null);
      refetchBalance();
      await joinEventsQuery.refetch();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit prediction.");
    }
  }

  return (
    <div
      className="glass-panel rounded-2xl p-5 relative overflow-hidden"
      style={{
        border: `1px solid ${isLive ? "rgba(13,242,128,0.25)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {isLive && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #0df280, transparent)",
            animation: "gradientShift 2s ease infinite",
            backgroundSize: "200% 100%",
          }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">
            Round {round.roundNumber}
          </h3>
          {isFreeRound && (
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded mt-0.5 inline-block"
              style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
            >
              FREE PREDICTION ROUND
            </span>
          )}
        </div>
        {isLive ? (
          <Countdown targetMs={round.endTimeMs} label="Ends in" />
        ) : (
          <Countdown targetMs={round.startTimeMs} label="Starts in" />
        )}
      </div>

      {/* Vote bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
          <span style={{ color: "#22c55e" }}>UP {upPct}%</span>
          <span style={{ color: "#ef4444" }}>DOWN {100 - upPct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(239,68,68,0.25)" }}>
          <div
            className="h-full rounded-full animate-vote-bar"
            style={{ width: `${upPct}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>{round.upCount} players</span>
          <span>{round.downCount} players</span>
        </div>
      </div>

      {/* Direction buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {([DIRECTION.UP, DIRECTION.DOWN] as const).map((dir) => {
          const isUp = dir === DIRECTION.UP;
          const color = isUp ? "#22c55e" : "#ef4444";
          const isSelected = selectedDirection === dir;
          return (
            <button
              key={dir}
              type="button"
              onClick={() => setSelectedDirection(dir)}
              disabled={userParticipated}
              className="rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-all"
              style={
                isSelected
                  ? {
                      backgroundColor: `${color}22`,
                      color,
                      border: `1.5px solid ${color}80`,
                      boxShadow: `0 0 16px ${color}25`,
                    }
                  : {
                      backgroundColor: `${color}08`,
                      color,
                      border: `1.5px solid ${color}25`,
                      opacity: userParticipated ? 0.5 : 1,
                    }
              }
            >
              {isUp ? "▲ UP" : "▼ DOWN"}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      {!account ? (
        <ConnectButton />
      ) : userParticipated ? (
        <div
          className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-center"
          style={{
            backgroundColor: "rgba(13,242,128,0.1)",
            color: "#0df280",
            border: "1px solid rgba(13,242,128,0.25)",
          }}
        >
          Predicted {formatDirection(userJoinEvent!.direction)} ✓
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSubmitPrediction}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-center transition-all"
          style={
            canSubmit
              ? {
                  backgroundColor: "#0df280",
                  color: "#0a0a0a",
                  boxShadow: "0 0 20px rgba(13,242,128,0.3)",
                }
              : {
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "#64748b",
                  border: "1px solid rgba(255,255,255,0.08)",
                  opacity: 0.6,
                }
          }
        >
          {isJoinPending
            ? "Submitting…"
            : !isLive
            ? selectedDirection
              ? "Round not started yet — predict when live"
              : "Select UP or DOWN"
            : !selectedDirection
            ? "Select UP or DOWN"
            : isFreeRound
            ? "Predict (free)"
            : `Predict · ${formatUSDT(round.entryFeeRaw)} USDT`}
        </button>
      )}

      {submitError && (
        <p className="mt-3 text-[11px] font-bold text-red-400">{submitError}</p>
      )}
      {txDigest && (
        <a
          href={`${EXPLORER_BASE}/txblock/${txDigest}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-[11px] font-bold text-sky-300 hover:text-sky-200"
        >
          Tx: {txDigest.slice(0, 20)}…
        </a>
      )}
    </div>
  );
}

/* ─── Tournament claim reward panel ──────────────────────────────── */
const REWARD_PCT = [50, 30, 20]; // rank 1, 2, 3

function TournamentClaimPanel({
  tournament,
  account,
  allJoinEvents,
}: {
  tournament: TournamentGroup;
  account: ReturnType<typeof useCurrentAccount>;
  allJoinEvents: JoinGameEvent[];
}) {
  const { claimReward, isPending } = useClaimReward();
  const { claimRefund, isPending: isRefundPending } = useClaimRefund();
  const { refetch: refetchBalance } = useUSDTBalance(account?.address);
  const leaderboardQuery = useLeaderboardRows();

  const [msg, setMsg] = useState<string | null>(null);

  const addr = (account?.address ?? "").toLowerCase();

  // Check if user joined prize round
  const prizeRound = tournament.prizeRound;
  const prizeRoundEvents = useMemo(
    () => allJoinEvents.filter((e) =>
      e.sessionId ? e.sessionId === prizeRound.sessionId : e.roundNumber === prizeRound.roundNumber
    ),
    [allJoinEvents, prizeRound.sessionId, prizeRound.roundNumber],
  );
  const userJoinedPrize = prizeRoundEvents.some((e) => e.player.toLowerCase() === addr);

  // All rounds user participated in (for batch claim)
  const userRounds = useMemo(
    () => tournament.rounds.filter((r) => {
      const isDone = r.status === "ended" || r.isSettled;
      if (!isDone) return false;
      return allJoinEvents.some((e) =>
        (e.sessionId ? e.sessionId === r.sessionId : e.roundNumber === r.roundNumber) &&
        e.player.toLowerCase() === addr
      );
    }),
    [tournament.rounds, allJoinEvents, addr],
  );

  // Get user's leaderboard rank
  const userRank = useMemo(() => {
    const rows = leaderboardQuery.data ?? [];
    // Filter to prize round participants
    const prizeJoinAddrs = new Set(prizeRoundEvents.map((e) => e.player.toLowerCase()));
    const filtered = rows.filter((r) => prizeJoinAddrs.has(r.player.toLowerCase()));
    const idx = filtered.findIndex((r) => r.player.toLowerCase() === addr);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboardQuery.data, prizeRoundEvents, addr]);

  // Calculate pool and reward (SC takes 10% admin fee, then splits 50/30/20)
  const poolRaw = prizeRoundEvents.length * tournament.entryFeeRaw;
  const netPoolRaw = Math.floor(poolRaw * 90 / 100); // after 10% admin fee
  const rewardPct = userRank && userRank <= 3 ? REWARD_PCT[userRank - 1] : 0;
  const rewardRaw = Math.floor(netPoolRaw * rewardPct / 100);

  const allDone = tournament.rounds.every((r) => r.status === "ended" || r.isSettled || r.status === "upcoming");
  const isCancelled = prizeRound.isCancelled;

  if (!userJoinedPrize || userRounds.length === 0) return null;

  const rankColors = ["#facc15", "#cbd5e1", "#c2410c"];
  const rankLabels = ["1st", "2nd", "3rd"];

  async function handleClaim() {
    if (!account) return;
    setMsg(null);
    try {
      if (isCancelled) {
        await claimRefund(prizeRound.roundObjectId);
        setMsg("Refund claimed!");
      } else {
        // Check if prize round is settled
        if (!prizeRound.isSettled) {
          setMsg("Prize round belum settled. Buka arena page untuk finalize dulu.");
          return;
        }
        // Claim only the prize round
        await claimReward(prizeRound.sessionId, prizeRound.roundObjectId);
        setMsg("Reward claimed successfully!");
      }
      refetchBalance();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Claim failed.");
    }
  }

  return (
    <div
      className="glass-panel rounded-2xl p-5 space-y-4"
      style={{ border: "1px solid rgba(13,242,128,0.2)" }}
    >
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        Claim Reward
      </p>

      {/* Rank display */}
      {userRank && userRank <= 3 ? (
        <div
          className="rounded-xl p-4 text-center"
          style={{
            backgroundColor: `${rankColors[userRank - 1]}10`,
            border: `1px solid ${rankColors[userRank - 1]}30`,
          }}
        >
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
            Your Rank
          </p>
          <p className="text-3xl font-black" style={{ color: rankColors[userRank - 1] }}>
            #{userRank}
          </p>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {rankLabels[userRank - 1]} Place — {rewardPct}% of pool
          </p>
        </div>
      ) : userRank ? (
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
            Your Rank
          </p>
          <p className="text-2xl font-black text-slate-500">#{userRank}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">No prize (top 3 only)</p>
        </div>
      ) : null}

      {/* Reward breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-bold">Pool</span>
          <span className="font-black text-slate-200">{formatUSDT(poolRaw)} USDT</span>
        </div>
        {userRank && userRank <= 3 && (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold">Your share ({rewardPct}%)</span>
              <span className="font-black" style={{ color: "#0df280" }}>
                {formatUSDT(rewardRaw)} USDT
              </span>
            </div>
          </>
        )}
      </div>

      {/* Claim button */}
      <button
        type="button"
        onClick={handleClaim}
        disabled={isPending || isRefundPending}
        className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        style={
          userRank && userRank <= 3
            ? {
                backgroundColor: "#0df280",
                color: "#0a0a0a",
                boxShadow: "0 0 20px rgba(13,242,128,0.3)",
                opacity: isPending ? 0.7 : 1,
              }
            : {
                backgroundColor: "rgba(255,255,255,0.07)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)",
                opacity: isPending ? 0.7 : 1,
              }
        }
      >
        {isPending || isRefundPending
          ? "Claiming…"
          : isCancelled
          ? "Claim Refund"
          : userRank && userRank <= 3
          ? `Claim ${formatUSDT(rewardRaw)} USDT`
          : "Claim Refund"}
      </button>

      {msg && (
        <p
          className="text-[11px] font-bold text-center"
          style={{ color: msg.includes("failed") ? "#ef4444" : "#0df280" }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

/* ─── Main tournament detail page ────────────────────────────────── */
export default function TournamentDetailPage() {
  const params = useParams();
  const account = useCurrentAccount();
  const routeId = params?.id;
  const rawId = Array.isArray(routeId) ? (routeId[0] as string) : (routeId as string);

  const tournamentsQuery = useOnChainTournaments();
  const leaderboardQuery = useLeaderboardRows();
  const allRounds = useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data]);

  // Determine if rawId is a seasonId (number) or a sessionId (hex string)
  const isSeasonId = /^\d+$/.test(rawId ?? "");

  const tournament = useMemo((): TournamentGroup | null => {
    if (!rawId || allRounds.length === 0) return null;

    if (isSeasonId) {
      const seasonId = Number(rawId);
      const rounds = allRounds.filter((r) => r.seasonId === seasonId);
      return buildTournamentGroup(seasonId, rounds);
    } else {
      // Legacy: sessionId → wrap single round in a group
      const round = allRounds.find(
        (r) => r.sessionId.toLowerCase() === rawId.toLowerCase(),
      );
      if (!round) return null;
      return buildTournamentGroup(round.seasonId, [round]);
    }
  }, [rawId, isSeasonId, allRounds]);

  const joinEventsAllQuery = useRoundJoinEvents();

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  // Default to current/active round
  const displayRound = useMemo(() => {
    if (!tournament) return null;
    if (selectedRoundId) {
      return tournament.rounds.find((r) => r.sessionId === selectedRoundId) ?? null;
    }
    return tournament.currentRound ?? tournament.rounds[tournament.rounds.length - 1] ?? null;
  }, [tournament, selectedRoundId]);

  const finnhubSymbol = tournament ? toFinnhubSymbol(tournament.coinSymbol) : undefined;
  const quoteQuery = useMarketQuote(finnhubSymbol);
  const candlesQuery = useMarketCandles(finnhubSymbol, "5", 6);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const leaderboardRows = useMemo(() => {
    const rows = leaderboardQuery.data ?? [];
    if (!tournament) return rows.slice(0, 10);
    // Filter to participants of this tournament's prize round
    const prizeRoundNumber = tournament.prizeRound.roundNumber;
    const prizeJoins = new Set(
      (joinEventsAllQuery.data ?? [])
        .filter((e) => e.roundNumber === prizeRoundNumber)
        .map((e) => e.player.toLowerCase()),
    );
    const filtered = rows.filter((r) => prizeJoins.has(r.player.toLowerCase()));
    return filtered.slice(0, 10);
  }, [leaderboardQuery.data, tournament, joinEventsAllQuery.data]);

  // Count prize round joins from events (stable, doesn't change after settle)
  const prizeRoundJoinCount = useMemo(() => {
    if (!tournament) return 0;
    const prizeRoundNumber = tournament.prizeRound.roundNumber;
    return (joinEventsAllQuery.data ?? []).filter((e) => e.roundNumber === prizeRoundNumber).length;
  }, [tournament, joinEventsAllQuery.data]);

  const statusConfig = {
    live: { color: "#0df280", bg: "rgba(13,242,128,0.12)", border: "rgba(13,242,128,0.35)" },
    upcoming: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
    completed: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" },
  };

  if (tournamentsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin-slow"
            style={{ border: "2px solid rgba(13,242,128,0.2)", borderTop: "2px solid #0df280" }}
          />
          <p className="text-slate-500 text-sm font-bold">Loading tournament…</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="text-center">
          <p className="text-slate-400 text-lg font-black mb-4">Tournament not found</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest"
            style={{ color: "#0df280" }}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusConfig[tournament.status];

  return (
    <div
      style={{ backgroundColor: "#0a0a0a" }}
      className="relative z-10 text-slate-100 antialiased min-h-screen overflow-x-hidden"
    >
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blue-cyber-grid absolute inset-0 opacity-30" />
        {tournament.status === "live" && (
          <div
            className="absolute top-0 left-1/2 w-[600px] h-[400px] rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              background: "radial-gradient(circle, rgba(13,242,128,0.07) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
        )}
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20">

        {/* Back nav */}
        <div className="mb-6">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm leading-none">arrow_back</span>
            All Tournaments
          </Link>
        </div>

        {/* ── Tournament Header ── */}
        <div
          className="glass-panel rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{ borderTop: `2px solid ${sc.border}` }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${sc.color}06 0%, transparent 60%)`,
            }}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <CryptoIcon3D symbol={tournament.coinSymbol} size={64} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black uppercase italic">
                    {tournament.coinSymbol}
                    <span className="text-slate-500 font-bold text-xl"> / USDT</span>
                  </h1>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                    style={{ color: sc.color, backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}
                  >
                    {tournament.status === "live" && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-live-dot"
                        style={{ backgroundColor: sc.color }}
                      />
                    )}
                    {tournament.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-bold">
                  Season {tournament.seasonId} · {tournament.totalRounds} Rounds · {tournament.completedRounds}/{tournament.totalRounds} completed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6 flex-wrap">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Entry Fee</p>
                <p className="text-2xl font-black" style={{ color: "#facc15" }}>
                  {formatUSDT(tournament.entryFeeRaw)} USDT
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Prize Pool</p>
                <p className="text-2xl font-black" style={{ color: "#0df280" }}>
                  {formatUSDT(prizeRoundJoinCount * tournament.entryFeeRaw)} USDT
                </p>
              </div>
              {!account && (
                <ConnectButton />
              )}
            </div>
          </div>
        </div>

        {/* ── Round Timeline ── */}
        <div
          className="glass-panel rounded-2xl px-6 py-4 mb-6"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">
            Round Timeline
          </p>
          <RoundTimeline
            rounds={tournament.rounds}
            activeRound={tournament.currentRound}
            onSelect={(r) => setSelectedRoundId(r.sessionId)}
            selectedRoundId={selectedRoundId ?? displayRound?.sessionId ?? null}
          />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left: chart + active round panel */}
          <div className="lg:col-span-2 space-y-6">

            {/* Price chart */}
            {displayRound && (
              <div
                className="glass-panel rounded-2xl p-5"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-300">
                    {tournament.coinSymbol}/USDT Live Chart
                  </p>
                  {quoteQuery.data && (
                    <span className="text-xl font-black" style={{ color: "#0df280" }}>
                      ${quoteQuery.data.c.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <CandlestickChart
                  candles={candlesQuery.data ?? null}
                  quote={quoteQuery.data ?? null}
                  symbol={tournament.coinSymbol}
                  isLoading={candlesQuery.isLoading}
                />
                {displayRound.priceStart > 0 && (
                  <div className="mt-3 flex items-center gap-4 text-[10px] font-bold">
                    <span className="text-slate-500">
                      R{displayRound.roundNumber} Start:{" "}
                      <span style={{ color: "#f59e0b" }}>
                        ${(displayRound.priceStart / 1e8).toFixed(2)}
                      </span>
                    </span>
                    {quoteQuery.data && displayRound.priceStart > 0 && (
                      <span
                        className="font-black"
                        style={{
                          color:
                            quoteQuery.data.c * 1e8 > displayRound.priceStart
                              ? "#22c55e"
                              : "#ef4444",
                        }}
                      >
                        {quoteQuery.data.c * 1e8 > displayRound.priceStart ? "▲ UP" : "▼ DOWN"} from entry
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Active round predict panel */}
            {displayRound && (displayRound.status === "live" || displayRound.status === "upcoming") && (
              <ActiveRoundPanel
                key={displayRound.sessionId}
                round={displayRound}
                tournament={tournament}
                account={account}
              />
            )}

            {/* Claim reward panel */}
            {account && tournament.rounds.some(r => r.status === "ended" || r.isSettled) && (
              <TournamentClaimPanel
                tournament={tournament}
                account={account}
                allJoinEvents={joinEventsAllQuery.data ?? []}
              />
            )}
          </div>

          {/* Right: leaderboard + round info */}
          <div className="space-y-6">

            {/* Tournament Leaderboard */}
            <TournamentLiveLeaderboard
              tournament={tournament}
              allEvents={joinEventsAllQuery.data ?? []}
            />

            {/* Round details card */}
            {displayRound && (
              <div
                className="glass-panel rounded-2xl p-5 space-y-3"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Round {displayRound.roundNumber} Details
                </p>
                {[
                  { label: "Start", value: formatDateTime(displayRound.startTimeMs) },
                  { label: "End", value: formatDateTime(displayRound.endTimeMs) },
                  {
                    label: "Entry Fee",
                    value:
                      displayRound.entryFeeRaw <= 1
                        ? "Free (score round)"
                        : `${formatUSDT(displayRound.entryFeeRaw)} USDT`,
                  },
                  { label: "Participants", value: prizeRoundJoinCount },
                  {
                    label: "Pool",
                    value: `${formatUSDT(prizeRoundJoinCount * tournament.entryFeeRaw)} USDT`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      {item.label}
                    </span>
                    <span className="text-xs font-black text-slate-200">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Round History ── */}
            <div
              className="glass-panel rounded-2xl p-5"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">
                Round History
              </p>
              {tournament.rounds.some((r) => r.status === "ended" || r.isSettled) ? (
                <div className="space-y-3">
                  {(() => {
                    const allSorted = [...tournament.rounds].sort((a, b) => a.startTimeMs - b.startTimeMs);
                    const doneRounds = allSorted
                      .filter((r) => r.status === "ended" || r.isSettled)
                      .reverse();
                    return doneRounds.map((r) => {
                      const idx = allSorted.findIndex((x) => x.sessionId === r.sessionId);
                      return (
                        <RoundHistorySidebar
                          key={r.sessionId}
                          round={r}
                          roundIndex={idx + 1}
                          allJoinEvents={joinEventsAllQuery.data ?? []}
                          livePrice={quoteQuery.data?.c ?? null}
                        />
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 font-bold italic">
                  No rounds completed yet.
                </p>
              )}
            </div>

            {/* Faucet */}
            {account && (
              <div
                className="glass-panel rounded-2xl p-4"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">
                  Need USDT?
                </p>
                <FaucetButton />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
