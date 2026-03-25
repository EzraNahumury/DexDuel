"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@onelabs/dapp-kit";
import { useLeaderboardRows } from "@/hooks/useLeaderboard";
import {
  useOnChainTournaments,
  usePlayerJoinEvents,
  usePlayerWinnerRankEvents,
  usePlayerClaimEvents,
  useRoundJoinEvents,
  type OnChainTournament,
  type JoinGameEvent,
} from "@/hooks/useOnChainTournaments";
import { useMultiRoundTournaments, type TournamentGroup } from "@/hooks/useMultiRoundTournaments";
import { useUSDTBalance } from "@/hooks/useUSDTBalance";
import { useClaimReward } from "@/hooks/useClaimReward";
import { useCompleteGame } from "@/hooks/useCompleteGame";
import { useSettleGame } from "@/hooks/useSettleGame";
import { toFinnhubSymbol } from "@/hooks/useMarketData";
import {
  DIRECTION,
  EXPLORER_BASE,
  formatUSDT,
} from "@/lib/constants";
import { FaucetButton } from "@/components/FaucetButton";

/* ─── Types ──────────────────────────────────────────────────────── */
type ClaimStates = Record<
  string,
  { status: "pending" | "done" | "error"; digest?: string; error?: string }
>;

type EnrichedEvent = JoinGameEvent & {
  tournament: OnChainTournament | undefined;
  outcome: "won" | "lost" | "pending" | "finalizing";
  winnerRank: 0 | 1 | 2 | 3;
  prizeRewardRaw: number;
  isClaimed: boolean;
};

type PlayerGroup = {
  group: TournamentGroup;
  playerRounds: EnrichedEvent[];
};

const RANK_PRIZE_BPS: Record<1 | 2 | 3, number> = {
  1: 5000,
  2: 3000,
  3: 2000,
};

function computePrizeRewardRaw(finalPrizePool: number, rank: 0 | 1 | 2 | 3): number {
  if (rank === 0) return 0;
  const bps = RANK_PRIZE_BPS[rank];
  return Math.floor((finalPrizePool * bps) / 10_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableClaimError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  // Abort code 14 = ERR_ALREADY_CLAIMED, 9 = ERR_NOT_PARTICIPANT
  const fatalTokens = ["already claimed", "not participant", "wallet not connected", "insufficient", "rejected", "denied"];
  if (fatalTokens.some((token) => message.includes(token))) return false;
  // MoveAbort with code 14 (already claimed) or 9 (not participant) are fatal
  const abortCodeMatch = message.match(/moveabort.*?(\d+)\s*\)\s*in/);
  if (abortCodeMatch) {
    const code = Number(abortCodeMatch[1]);
    if (code === 14 || code === 9 || code === 10) return false; // already claimed, not participant, not ended
  }
  const retryTokens = ["not settled", "winners", "not ended", "still active", "moveabort", "abort"];
  return retryTokens.some((token) => message.includes(token));
}

async function waitForSettlement(
  sessionId: string,
  getTournaments: () => OnChainTournament[],
  refetchTournaments: () => Promise<{ data?: OnChainTournament[] }>,
  maxAttempts = 30,
  delayMs = 2_000,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = getTournaments().find((t) => t.sessionId === sessionId);
    if (current?.isSettled) return true;

    const refreshed = await refetchTournaments();
    const latest = refreshed.data ?? [];
    const afterRefetch = latest.find((t) => t.sessionId === sessionId);
    if (afterRefetch?.isSettled) return true;

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }
  return false;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatDate(timestampMs: number): string {
  if (!timestampMs) return "-";
  return new Date(timestampMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Fetch the historical end price for a round using the /api/rounds/price endpoint.
 * Falls back to the live quote only if historical data is unavailable.
 */
async function getRoundEndPriceRaw(
  coinSymbol: string,
  roundObjectId: string,
  endTimeMs: number,
  priceStart: number,
): Promise<number> {
  const symbol = toFinnhubSymbol(coinSymbol);

  // 1. Try historical price via /api/rounds/price (Finnhub → CoinGecko → DB)
  try {
    const params = new URLSearchParams({
      roundObjectId,
      symbol,
      coinSymbol,
      endTimeMs: String(endTimeMs),
      priceStart: String(priceStart),
    });
    const response = await fetch(`/api/rounds/price?${params}`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (data.priceEnd != null && data.priceEnd > 0) {
        return Math.floor(data.priceEnd * 100_000_000);
      }
    }
  } catch { /* fall through to live price */ }

  // 2. Fallback: live price (only if round just ended)
  const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to fetch market price.");
  }
  const price = Number(payload?.c);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Invalid market price.");
  }
  return Math.floor(price * 100_000_000);
}

function rankColor(rank: number): string {
  if (rank === 1) return "#facc15";
  if (rank === 2) return "#cbd5e1";
  if (rank === 3) return "#c2410c";
  return "#94a3b8";
}

function rankLabel(rank: number): string {
  if (rank === 1) return "#1";
  if (rank === 2) return "#2";
  if (rank === 3) return "#3";
  return `#${rank}`;
}

/* Stat card */
function StatCard({
  label,
  value,
  icon,
  color,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  delay?: number;
}) {
  return (
    <div
      className="animate-card-enter group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 0%, ${color}18 0%, transparent 65%)`,
        }}
      />
      <div className="relative z-10">
        <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}14`, border: `1px solid ${color}25` }}>
          <span className="material-symbols-outlined text-lg" style={{ color }}>
            {icon}
          </span>
        </div>
        <p className="text-2xl font-black tracking-tight" style={{ color }}>
          {value}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

/* Tournament Group History Card — simplified */
const REWARD_PCT_PROFILE = [50, 30, 20];

function TournamentGroupCard({
  group,
  playerRounds,
  claimStates,
  onClaimTournament,
  mounted,
  leaderboardRows,
  allJoinEvents,
  userAddress,
}: {
  group: TournamentGroup;
  playerRounds: EnrichedEvent[];
  claimStates: ClaimStates;
  onClaimTournament: (rounds: EnrichedEvent[]) => void;
  mounted: boolean;
  leaderboardRows: Array<{ player: string; rank: number }>;
  allJoinEvents: JoinGameEvent[];
  userAddress: string;
}) {
  const wins = playerRounds.filter((r) => r.outcome === "won").length;
  const finished = playerRounds.filter((r) => r.outcome === "won" || r.outcome === "lost").length;

  // Only the prize round matters for claiming
  const prizeEvent = playerRounds.find((r) => r.tournament && r.tournament.entryFeeRaw > 1);
  const prizeRoundTournament = prizeEvent?.tournament;
  const prizeClaimState = prizeRoundTournament ? claimStates[prizeRoundTournament.sessionId] : undefined;
  const isPrizeClaimed = prizeEvent?.isClaimed || prizeClaimState?.status === "done";
  const isPrizePending = prizeClaimState?.status === "pending";
  const prizeClaimError = prizeClaimState?.status === "error" ? prizeClaimState.error : null;
  const canClaimPrize = prizeEvent && !isPrizeClaimed && prizeRoundTournament &&
    (prizeRoundTournament.status === "ended" || prizeRoundTournament.isSettled) &&
    (!prizeClaimState || prizeClaimState.status === "error");

  // Calculate rank from tournament win data
  const prizeRound = group.prizeRound;

  // Count prize round participants from events
  const prizeJoinAddrs = useMemo(() => {
    const set = new Set<string>();
    for (const e of allJoinEvents) {
      const match = e.sessionId ? e.sessionId === prizeRound.sessionId : e.roundNumber === prizeRound.roundNumber;
      if (match) set.add(e.player.toLowerCase());
    }
    return set;
  }, [allJoinEvents, prizeRound.sessionId, prizeRound.roundNumber]);

  // Build per-player win count across all rounds in this tournament, then rank
  const userRank = useMemo(() => {
    // Get all events for this tournament's rounds
    const roundIds = new Set(group.rounds.map((r) => r.roundNumber));
    const sessionIds = new Set(group.rounds.map((r) => r.sessionId));
    const tournamentEvents = allJoinEvents.filter((e) =>
      e.sessionId ? sessionIds.has(e.sessionId) : roundIds.has(e.roundNumber)
    );

    // Build winner direction map for each round
    const winDirMap = new Map<number, 1 | 2>();
    for (const r of group.rounds) {
      if (r.winnerDirection === 1 || r.winnerDirection === 2) {
        winDirMap.set(r.roundNumber, r.winnerDirection);
      }
    }

    // Count wins per player
    const playerWins = new Map<string, number>();
    for (const e of tournamentEvents) {
      const addr = e.player.toLowerCase();
      if (!prizeJoinAddrs.has(addr)) continue; // only prize round participants
      const winDir = winDirMap.get(e.roundNumber);
      if (winDir && e.direction === winDir) {
        playerWins.set(addr, (playerWins.get(addr) ?? 0) + 1);
      } else if (!playerWins.has(addr)) {
        playerWins.set(addr, 0);
      }
    }

    // Sort by wins descending
    const sorted = Array.from(playerWins.entries()).sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([addr]) => addr === userAddress.toLowerCase());
    return idx >= 0 ? idx + 1 : 0;
  }, [group.rounds, allJoinEvents, prizeJoinAddrs, userAddress]);

  const prizeJoinCount = prizeJoinAddrs.size;
  const poolRaw = prizeJoinCount * group.entryFeeRaw;

  // Check if user won the prize round prediction
  const userPrizeEvent = useMemo(() => {
    return allJoinEvents.find((e) => {
      const match = e.sessionId ? e.sessionId === prizeRound.sessionId : e.roundNumber === prizeRound.roundNumber;
      return match && e.player.toLowerCase() === userAddress.toLowerCase();
    });
  }, [allJoinEvents, prizeRound.sessionId, prizeRound.roundNumber, userAddress]);

  const prizeWinDir = prizeRound.winnerDirection;
  const userWonPrize = userPrizeEvent && (prizeWinDir === 1 || prizeWinDir === 2)
    ? userPrizeEvent.direction === prizeWinDir
    : false;

  // Reward: SC takes 10% admin fee from total pool, then splits 50/30/20 among top 3
  const netPoolRaw = Math.floor(poolRaw * 90 / 100); // after 10% admin fee
  const rewardPct = userRank >= 1 && userRank <= 3 ? REWARD_PCT_PROFILE[userRank - 1] : 0;
  const rewardRaw = Math.floor(netPoolRaw * rewardPct / 100);

  const rankColors = ["#facc15", "#cbd5e1", "#c2410c"];
  const rankLabels = ["1st", "2nd", "3rd"];

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: canClaimPrize ? "rgba(13,242,128,0.35)" : "rgba(255,255,255,0.06)",
        background: canClaimPrize
          ? "linear-gradient(135deg, rgba(13,242,128,0.06) 0%, rgba(255,255,255,0.02) 100%)"
          : "rgba(255,255,255,0.025)",
      }}
    >
      {/* Top accent line */}
      {canClaimPrize && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0df280] to-transparent opacity-60" />
      )}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: canClaimPrize
            ? "radial-gradient(ellipse at 50% 0%, rgba(13,242,128,0.08), transparent 60%)"
            : "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        {/* Left: coin + season + result */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-black"
            style={{
              borderColor: userRank >= 1 && userRank <= 3 ? `${rankColors[userRank - 1]}40` : "rgba(255,255,255,0.08)",
              backgroundColor: userRank >= 1 && userRank <= 3 ? `${rankColors[userRank - 1]}12` : "rgba(255,255,255,0.03)",
              color: userRank >= 1 && userRank <= 3 ? rankColors[userRank - 1] : "#94a3b8",
            }}
          >
            {group.coinSymbol.slice(0, 3)}
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-100">
              {group.coinSymbol}<span className="text-slate-500">/USDT</span>
              <span className="ml-2 text-[11px] font-semibold text-slate-600">S{group.seasonId}</span>
            </h4>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500">
                {wins}/{finished} won
              </span>
              {userRank >= 1 && userRank <= 3 && (
                <span
                  className="rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider"
                  style={{
                    color: rankColors[userRank - 1],
                    backgroundColor: `${rankColors[userRank - 1]}15`,
                    border: `1px solid ${rankColors[userRank - 1]}30`,
                  }}
                >
                  {rankLabels[userRank - 1]} · {rewardPct}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: reward + claim button */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">Reward</p>
            <p
              className="text-lg font-black tabular-nums"
              style={{ color: rewardRaw > 0 ? "#0df280" : "#475569" }}
            >
              {rewardRaw > 0 ? `${formatUSDT(rewardRaw)} USDT` : "—"}
            </p>
          </div>

          {isPrizeClaimed ? (
            <span className="rounded-xl border border-[#0df280]/25 bg-[#0df280]/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0df280]">
              Claimed
            </span>
          ) : (
            <button
              type="button"
              onClick={() => prizeEvent && onClaimTournament([prizeEvent])}
              disabled={!canClaimPrize || isPrizePending}
              className="rounded-xl px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
              style={
                canClaimPrize
                  ? {
                      backgroundColor: "#0df280",
                      color: "#0a0a0a",
                      boxShadow: "0 0 20px rgba(13,242,128,0.3), 0 4px 12px rgba(13,242,128,0.15)",
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.04)",
                      color: "#64748b",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }
              }
            >
              {isPrizePending ? "Claiming..." : "Claim"}
            </button>
          )}
        </div>
      </div>
      {prizeClaimError && (
        <div className="border-t border-red-500/15 bg-red-500/5 px-5 py-2">
          <p className="text-[10px] font-semibold text-red-400">{prizeClaimError}</p>
        </div>
      )}
    </article>
  );
}

export default function ProfilePage() {
  const account = useCurrentAccount();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { balance, refetch: refetchBalance } = useUSDTBalance(account?.address);
  const leaderboardQuery = useLeaderboardRows();
  const allJoinEventsQuery = useRoundJoinEvents();
  const joinedEventsQuery = usePlayerJoinEvents(account?.address);
  const winnerRanksQuery = usePlayerWinnerRankEvents(account?.address);
  const tournamentsQuery = useOnChainTournaments();
  const groupsQuery = useMultiRoundTournaments();
  const claimEventsQuery = usePlayerClaimEvents(account?.address);
  const { claimReward, batchClaimReward } = useClaimReward();
  const { completeGame } = useCompleteGame();
  const { settleGame } = useSettleGame();

  const [claimStates, setClaimStates] = useState<ClaimStates>({});

  /* ── derived data ── */
  const leaderboardRows = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);
  const joinedEvents = useMemo(
    () => [...(joinedEventsQuery.data ?? [])].sort((a, b) => b.timestampMs - a.timestampMs),
    [joinedEventsQuery.data],
  );
  const winnerRanks = useMemo(
    () => winnerRanksQuery.data ?? [],
    [winnerRanksQuery.data],
  );
  const tournaments = useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data]);
  const tournamentGroups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);

  /* round number → OnChainTournament lookup */
  const tournamentByRoundNumber = useMemo(() => {
    const map = new Map<number, OnChainTournament>();
    for (const t of tournaments) {
      if (!map.has(t.roundNumber)) map.set(t.roundNumber, t);
    }
    return map;
  }, [tournaments]);

  const winnerRankByRoundNumber = useMemo(() => {
    const map = new Map<number, 1 | 2 | 3>();
    for (const rankEvent of winnerRanks) {
      if (!map.has(rankEvent.roundNumber)) {
        map.set(rankEvent.roundNumber, rankEvent.rank);
      }
    }
    return map;
  }, [winnerRanks]);

  /* Set of round numbers already claimed on-chain */
  const claimedRoundNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const event of claimEventsQuery.data ?? []) {
      set.add(event.roundNumber);
    }
    return set;
  }, [claimEventsQuery.data]);

  /* Derive winner direction from price API for ended rounds where on-chain winnerDirection === 0 */
  const [derivedWinners, setDerivedWinners] = useState<Map<number, 1 | 2>>(new Map());
  const fetchedRoundsRef = useRef(new Set<string>());

  useEffect(() => {
    for (const t of tournaments) {
      if (t.winnerDirection !== 0) continue; // already set on-chain
      if (t.status !== "ended") continue;
      if (t.priceStart <= 0) continue;
      const key = t.roundObjectId;
      if (fetchedRoundsRef.current.has(key)) continue;
      fetchedRoundsRef.current.add(key);

      const symbol = toFinnhubSymbol(t.coinSymbol);
      const params = new URLSearchParams({
        roundObjectId: t.roundObjectId,
        symbol,
        coinSymbol: t.coinSymbol,
        endTimeMs: String(t.endTimeMs),
        priceStart: String(t.priceStart),
      });
      fetch(`/api/rounds/price?${params}`, { cache: "no-store" })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.winnerDir === 1 || data?.winnerDir === 2) {
            setDerivedWinners((prev) => {
              const next = new Map(prev);
              next.set(t.roundNumber, data.winnerDir);
              return next;
            });
          }
        })
        .catch(() => {});
    }
  }, [tournaments]);

  /* enrich each join event with tournament + outcome */
  const enrichedEvents = useMemo<EnrichedEvent[]>(
    () =>
      joinedEvents.map((event) => {
        const t = tournamentByRoundNumber.get(event.roundNumber);
        let outcome: "won" | "lost" | "pending" | "finalizing" = "pending";
        // Use on-chain winnerDirection first, fall back to derived from price API
        const winDir = t
          ? (t.winnerDirection === 1 || t.winnerDirection === 2)
            ? t.winnerDirection
            : derivedWinners.get(t.roundNumber) ?? 0
          : 0;
        if (winDir === 1 || winDir === 2) {
          outcome = event.direction === winDir ? "won" : "lost";
        } else if (t && t.status === "ended") {
          outcome = "finalizing";
        }
        const winnerRank = t ? (winnerRankByRoundNumber.get(t.roundNumber) ?? 0) : 0;
        const prizeRewardRaw = t && t.isSettled
          ? computePrizeRewardRaw(t.finalPrizePool, winnerRank)
          : 0;
        const isClaimed = claimedRoundNumbers.has(event.roundNumber);
        return { ...event, tournament: t, outcome, winnerRank, prizeRewardRaw, isClaimed };
      }),
    [joinedEvents, tournamentByRoundNumber, winnerRankByRoundNumber, claimedRoundNumbers, derivedWinners],
  );

  /* group enriched events by seasonId → TournamentGroup */
  const playerGroups = useMemo<PlayerGroup[]>(() => {
    const bySeasonId = new Map<number, EnrichedEvent[]>();
    for (const e of enrichedEvents) {
      const sid = e.tournament?.seasonId;
      if (sid === undefined) continue;
      const list = bySeasonId.get(sid) ?? [];
      list.push(e);
      bySeasonId.set(sid, list);
    }

    const result: PlayerGroup[] = [];
    for (const [sid, events] of bySeasonId.entries()) {
      const group = tournamentGroups.find((g) => g.seasonId === sid);
      if (!group) continue;
      result.push({
        group,
        playerRounds: [...events].sort(
          (a, b) => (a.tournament?.roundNumber ?? 0) - (b.tournament?.roundNumber ?? 0),
        ),
      });
    }
    return result.sort(
      (a, b) => b.group.prizeRound.startTimeMs - a.group.prizeRound.startTimeMs,
    );
  }, [enrichedEvents, tournamentGroups]);

  /* stats */
  const myRow = useMemo(
    () =>
      leaderboardRows.find(
        (row) => row.player.toLowerCase() === (account?.address ?? "").toLowerCase(),
      ) ?? null,
    [leaderboardRows, account?.address],
  );
  const wins = useMemo(
    () => enrichedEvents.filter((r) => r.outcome === "won").length,
    [enrichedEvents],
  );
  const totalFinished = useMemo(
    () => enrichedEvents.filter((r) => r.outcome === "won" || r.outcome === "lost").length,
    [enrichedEvents],
  );
  const winRate = totalFinished > 0 ? Math.round((wins / totalFinished) * 100) : 0;
  const upPredictions = useMemo(
    () => joinedEvents.filter((e) => e.direction === DIRECTION.UP).length,
    [joinedEvents],
  );
  const downPredictions = joinedEvents.length - upPredictions;
  const upPct =
    joinedEvents.length > 0 ? Math.round((upPredictions / joinedEvents.length) * 100) : 50;

  /* total claimable count */
  const claimableEvents = useMemo(
    () =>
      enrichedEvents.filter((event) => {
        if (event.isClaimed) return false;
        const tournament = event.tournament;
        if (!tournament) return false;
        const claimState = claimStates[tournament.sessionId];
        return (
          tournament.status === "ended" &&
          (!claimState || claimState.status === "error")
        );
      }),
    [enrichedEvents, claimStates],
  );

  const totalClaimable = claimableEvents.length;
  const claimablePrizeCount = useMemo(
    () => claimableEvents.filter((event) => event.winnerRank > 0).length,
    [claimableEvents],
  );
  const totalClaimablePrizeRaw = useMemo(
    () => claimableEvents.reduce((sum, event) => sum + event.prizeRewardRaw, 0),
    [claimableEvents],
  );

  const initial = account?.address ? account.address.slice(2, 4).toUpperCase() : "?";

  async function tryFinalizeRoundForClaim(sessionId: string) {
    if (!account) return;
    const tournaments = tournamentsQuery.data ?? [];
    const targetRound = tournaments.find((round) => round.sessionId === sessionId);
    if (!targetRound || targetRound.isSettled) return;
    if (!targetRound.leaderboardId) return;

    // Anyone can finalize on-chain (admin check removed from SC)

    const allJoinEvents = allJoinEventsQuery.data ?? [];
    const leaderboardRows = leaderboardQuery.data ?? [];

    if (targetRound.winnerDirection === 0) {
      const priceEndRaw = await getRoundEndPriceRaw(
        targetRound.coinSymbol,
        targetRound.roundObjectId,
        targetRound.endTimeMs,
        targetRound.priceStart,
      );
      const isFreeRound = targetRound.entryFeeRaw <= 1;
      let top3Players: string[] = [];

      if (isFreeRound) {
        const winDir =
          priceEndRaw > targetRound.priceStart ? 1 : priceEndRaw < targetRound.priceStart ? 2 : 0;
        if (winDir !== 0) {
          top3Players = allJoinEvents
            .filter((event) => event.roundNumber === targetRound.roundNumber && event.direction === winDir)
            .sort((a, b) => a.timestampMs - b.timestampMs)
            .slice(0, 3)
            .map((event) => event.player);
        }
      } else {
        const roundParticipants = new Set(
          allJoinEvents
            .filter((event) => event.roundNumber === targetRound.roundNumber)
            .map((event) => event.player.toLowerCase()),
        );
        top3Players = leaderboardRows
          .filter((row) => roundParticipants.has(row.player.toLowerCase()))
          .slice(0, 3)
          .map((row) => row.player);
      }

      await completeGame({
        sessionId: targetRound.sessionId,
        roundId: targetRound.roundObjectId,
        registryId: targetRound.registryId,
        leaderboardId: targetRound.leaderboardId,
        priceEndRaw,
        top3Players,
      });
      await sleep(1_200);
    }

    await settleGame({ roundId: targetRound.roundObjectId });
    await tournamentsQuery.refetch();
  }

  /* ── handlers ── */
  async function handleClaimRound(sessionId: string, roundObjectId: string) {
    setClaimStates((prev) => ({ ...prev, [sessionId]: { status: "pending" } }));
    try {
      await tryFinalizeRoundForClaim(sessionId);

      const settled = await waitForSettlement(
        sessionId,
        () => tournamentsQuery.data ?? [],
        () => tournamentsQuery.refetch(),
      );
      if (!settled) {
        throw new Error("Round masih finalizing. Coba claim lagi dalam beberapa detik.");
      }

      let lastError: Error | null = null;
      let result: Awaited<ReturnType<typeof claimReward>> | null = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          result = await claimReward(sessionId, roundObjectId);
          break;
        } catch (err) {
          const claimError = err instanceof Error ? err : new Error("Claim failed");
          lastError = claimError;
          if (!isRetryableClaimError(claimError) || attempt === 7) {
            throw claimError;
          }
          await sleep(2_000);
          await tournamentsQuery.refetch();
        }
      }

      if (!result) {
        throw lastError ?? new Error("Claim failed");
      }

      setClaimStates((prev) => ({
        ...prev,
        [sessionId]: { status: "done", digest: result.digest ?? "" },
      }));
      await tournamentsQuery.refetch();
      refetchBalance();
    } catch (err) {
      setClaimStates((prev) => ({
        ...prev,
        [sessionId]: {
          status: "error",
          error: err instanceof Error ? err.message : "Claim failed",
        },
      }));
    }
  }

  async function handleClaimTournament(rounds: EnrichedEvent[]) {
    // Get the prize round from passed events
    const target = rounds
      .map((r) => r.tournament)
      .find((t): t is OnChainTournament => !!t && t.entryFeeRaw > 1);

    if (!target) return;

    const sessionId = target.sessionId;

    // Mark as pending
    setClaimStates((prev) => ({ ...prev, [sessionId]: { status: "pending" } }));

    try {
      // Refresh on-chain data
      await tournamentsQuery.refetch();
      const freshRounds = tournamentsQuery.data ?? [];
      const freshTarget = freshRounds.find((r) => r.sessionId === sessionId);

      if (!freshTarget) throw new Error("Round not found on-chain.");

      // Step 1: Finalize if needed (complete_game + settle_game)
      if (!freshTarget.isSettled) {
        if (freshTarget.winnerDirection === 0) {
          // Round not completed yet — must call completeGame first
          await tryFinalizeRoundForClaim(sessionId);
        }

        // Wait for settlement
        const settled = await waitForSettlement(
          sessionId,
          () => tournamentsQuery.data ?? [],
          () => tournamentsQuery.refetch(),
        );
        if (!settled) {
          throw new Error("Round belum settled. Buka arena page untuk finalize, lalu coba lagi.");
        }
      }

      // Step 2: Verify round is properly finalized before claiming
      await tournamentsQuery.refetch();
      const verifiedTarget = (tournamentsQuery.data ?? []).find((r) => r.sessionId === sessionId);
      if (!verifiedTarget?.isSettled) {
        throw new Error("Round belum settled. Buka arena page untuk finalize, lalu coba lagi.");
      }
      if (verifiedTarget.winnerDirection === 0) {
        throw new Error("Winner belum ditentukan. Buka arena page untuk finalize, lalu coba lagi.");
      }

      // Step 3: Claim
      const result = await claimReward(target.sessionId, target.roundObjectId);

      setClaimStates((prev) => ({
        ...prev,
        [sessionId]: { status: "done", digest: result.digest ?? "" },
      }));
      await tournamentsQuery.refetch();
      refetchBalance();
    } catch (err) {
      setClaimStates((prev) => ({
        ...prev,
        [sessionId]: {
          status: "error",
          error: err instanceof Error ? err.message : "Claim failed",
        },
      }));
    }
  }

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 10% 10%, rgba(45,212,191,0.08), transparent 32%), radial-gradient(circle at 85% 14%, rgba(56,189,248,0.08), transparent 35%)",
          }}
        />
        <div className="blue-cyber-grid absolute inset-0 opacity-15" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-28 md:px-8">
        {/* ── Not connected ── */}
        {!account && (
          <section className="mx-auto mt-10 max-w-lg">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03] p-10 text-center backdrop-blur-2xl">
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(45,212,191,0.08), transparent 55%)" }}
              />
              <div className="relative z-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/8">
                  <span className="material-symbols-outlined text-[44px] text-cyan-300">account_circle</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight">My Profile</h1>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                  Connect your wallet to view stats, tournament history, and claimable rewards.
                </p>
                <div className="mt-7 flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Connected ── */}
        {account && (
          <>
            {/* Hero Profile Header */}
            <section className="mb-8">
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl">
                {/* Ambient glow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(45,212,191,0.07), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(59,130,246,0.06), transparent 50%)" }}
                />

                <div className="relative z-10 p-6 md:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left — Avatar + Info */}
                    <div className="flex items-start gap-5">
                      <div className="relative shrink-0">
                        <div
                          className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border text-2xl font-black"
                          style={{
                            borderColor: myRow ? `${rankColor(myRow.rank)}40` : "rgba(255,255,255,0.08)",
                            background: myRow ? `linear-gradient(135deg, ${rankColor(myRow.rank)}15 0%, transparent 70%)` : "rgba(255,255,255,0.03)",
                            color: myRow ? rankColor(myRow.rank) : "#67e8f9",
                          }}
                        >
                          {initial}
                        </div>
                        {myRow && (
                          <span
                            className="absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border px-1 text-[9px] font-black"
                            style={{
                              color: rankColor(myRow.rank),
                              borderColor: `${rankColor(myRow.rank)}50`,
                              backgroundColor: "#0f172a",
                            }}
                          >
                            {rankLabel(myRow.rank)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2.5">
                          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                            My <span className="text-cyan-300">Profile</span>
                          </h1>
                          {myRow && (
                            <span
                              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                              style={{
                                color: rankColor(myRow.rank),
                                backgroundColor: `${rankColor(myRow.rank)}15`,
                                border: `1px solid ${rankColor(myRow.rank)}30`,
                              }}
                            >
                              Global {rankLabel(myRow.rank)}
                            </span>
                          )}
                        </div>
                        <p className="truncate font-mono text-xs text-slate-500">{account.address}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                          <span>{playerGroups.length} tournaments</span>
                          <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                          <span>{joinedEvents.length} rounds</span>
                          <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                          <span className="text-teal-400">{wins} wins</span>
                          <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                          <span style={{ color: winRate >= 50 ? "#2dd4bf" : "#fb7185" }}>{winRate}% win rate</span>
                        </div>
                      </div>
                    </div>

                    {/* Right — Balance */}
                    <div className="shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-md lg:min-w-[200px]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">USDT Balance</p>
                      <p className="mt-1 text-3xl font-black tabular-nums text-teal-300">{balance?.formatted ?? "0.00"}</p>
                      <div className="mt-3">
                        <FaucetButton address={account.address} onSuccess={refetchBalance} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stat Cards */}
            <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Tournaments" value={playerGroups.length} icon="sports_esports" color="#38bdf8" delay={0} />
              <StatCard label="Wins" value={wins} icon="emoji_events" color="#2dd4bf" delay={50} />
              <StatCard label="Win Rate" value={`${winRate}%`} icon="percent" color={winRate >= 50 ? "#2dd4bf" : "#fb7185"} delay={100} />
              <StatCard label="Score" value={(myRow?.totalScore ?? 0).toLocaleString()} icon="stars" color="#a78bfa" delay={150} />
              <StatCard label="Streak" value={myRow?.currentStreak ?? 0} icon="local_fire_department" color="#f59e0b" delay={200} />
              <StatCard label="Global Rank" value={myRow ? rankLabel(myRow.rank) : "-"} icon="leaderboard" color={myRow ? rankColor(myRow.rank) : "#94a3b8"} delay={250} />
            </section>

            {/* Prediction Split */}
            {joinedEvents.length > 0 && (
              <section className="mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
                  <div className="flex-1">
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Prediction Split</h3>
                    <div className="mb-2 flex justify-between text-xs font-semibold">
                      <span className="text-teal-300">UP — {upPredictions} ({upPct}%)</span>
                      <span className="text-rose-400">DOWN — {downPredictions} ({100 - upPct}%)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${upPct}%`,
                          background: "linear-gradient(90deg, #14b8a6, #2dd4bf)",
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-600">{wins}/{totalFinished} finished rounds</p>
                  </div>

                  <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Win Rate</p>
                    <p className="mt-1 text-4xl font-black tabular-nums" style={{ color: winRate >= 50 ? "#2dd4bf" : "#fb7185" }}>
                      {winRate}<span className="text-lg">%</span>
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Claimable Banner */}
            {totalClaimable > 0 && (
              <section className="mb-6 overflow-hidden rounded-2xl border border-[#0df280]/25 bg-[#0df280]/[0.04]">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="h-2 w-2 shrink-0 rounded-full animate-live-dot bg-[#0df280]" />
                  <p className="flex-1 text-sm text-slate-200">
                    <span className="font-bold text-[#0df280]">{totalClaimable} payout{totalClaimable !== 1 ? "s" : ""}</span>{" "}
                    ready to claim
                    {claimablePrizeCount > 0 && (
                      <span className="text-slate-400">
                        {" "}· Prize pool: <span className="font-bold text-[#0df280]">{formatUSDT(totalClaimablePrizeRaw)} USDT</span>
                      </span>
                    )}
                  </p>
                  <span className="material-symbols-outlined text-[#0df280]/60">arrow_downward</span>
                </div>
              </section>
            )}

            {/* Tournament History */}
            <section className="mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/8">
                    <span className="material-symbols-outlined text-sm text-cyan-300">history</span>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tournament History</h3>
                  {playerGroups.length > 0 && (
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-400">
                      {playerGroups.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/tournaments"
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-500/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300 transition hover:bg-cyan-500/15"
                >
                  Join New
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </header>

              <div className="border-b border-white/[0.04] px-5 py-2 text-[10px] font-semibold text-slate-600">
                Prize: 1st = 50% · 2nd = 30% · 3rd = 20%
              </div>

              {(joinedEventsQuery.isLoading || tournamentsQuery.isLoading) && (
                <div className="space-y-3 p-5">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-20 rounded-xl animate-shimmer" />
                  ))}
                </div>
              )}

              {!joinedEventsQuery.isLoading && !tournamentsQuery.isLoading && playerGroups.length === 0 && (
                <div className="py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                    <span className="material-symbols-outlined text-3xl text-slate-600">casino</span>
                  </div>
                  <p className="font-bold text-slate-300">No tournaments yet</p>
                  <p className="mt-1 text-sm text-slate-500">Join a tournament to start earning rewards.</p>
                  <Link
                    href="/tournaments"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/8 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-cyan-300 transition hover:bg-cyan-500/15"
                  >
                    <span className="material-symbols-outlined text-sm">sports_esports</span>
                    Browse Tournaments
                  </Link>
                </div>
              )}

              {!joinedEventsQuery.isLoading && !tournamentsQuery.isLoading && playerGroups.length > 0 && (
                <div className="space-y-2.5 p-4">
                  {playerGroups.map(({ group, playerRounds }) => (
                    <TournamentGroupCard
                      key={group.seasonId}
                      group={group}
                      playerRounds={playerRounds}
                      claimStates={claimStates}
                      onClaimTournament={handleClaimTournament}
                      mounted={mounted}
                      leaderboardRows={leaderboardRows}
                      allJoinEvents={allJoinEventsQuery.data ?? []}
                      userAddress={account?.address ?? ""}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Quick Links */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/leaderboard"
                className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-amber-400/25 hover:bg-white/[0.05]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/8">
                  <span className="material-symbols-outlined text-xl text-amber-300">emoji_events</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-100">Global Leaderboard</p>
                  <p className="text-xs text-slate-500">
                    {myRow ? `You are ranked ${rankLabel(myRow.rank)} globally` : "See how you rank globally"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400">arrow_forward</span>
              </Link>

              <Link
                href="/tournaments"
                className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-teal-400/25 hover:bg-white/[0.05]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-500/8">
                  <span className="material-symbols-outlined text-xl text-teal-300">sports_esports</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-100">Browse Tournaments</p>
                  <p className="text-xs text-slate-500">Join live rounds and earn USDT prizes</p>
                </div>
                <span className="material-symbols-outlined text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400">arrow_forward</span>
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
