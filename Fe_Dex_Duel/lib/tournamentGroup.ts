import type { OnChainTournament } from "@/hooks/useOnChainTournaments";

export interface TournamentGroup {
  seasonId: number;
  coinSymbol: string;
  rounds: OnChainTournament[]; // sorted by startTimeMs asc
  leaderboardId: string | null;
  prizeRound: OnChainTournament; // round with highest entryFeeRaw (usually round 1)
  currentRound: OnChainTournament | null; // active round right now
  nextRound: OnChainTournament | null; // next upcoming round
  status: "upcoming" | "live" | "completed";
  totalRounds: number;
  completedRounds: number; // rounds that are settled or ended
  entryFeeRaw: number; // from prizeRound
  totalPrizePoolRaw: number; // prizeRound.totalPoolRaw
  creatorAddress: string;
}

export function buildTournamentGroup(
  seasonId: number,
  rounds: OnChainTournament[],
): TournamentGroup | null {
  if (rounds.length === 0) return null;

  // Sort rounds by startTimeMs asc
  const sorted = [...rounds].sort((a, b) => {
    if (a.startTimeMs !== b.startTimeMs) return a.startTimeMs - b.startTimeMs;
    return a.roundNumber - b.roundNumber;
  });

  // Prize round = highest entry fee (usually round 1)
  const prizeRound = sorted.reduce(
    (best, r) => (r.entryFeeRaw > best.entryFeeRaw ? r : best),
    sorted[0],
  );

  // Leaderboard ID: find from any round that has it
  const leaderboardId = sorted.find((r) => r.leaderboardId)?.leaderboardId ?? null;

  // Current round: live > upcoming (first upcoming)
  const currentRound =
    sorted.find((r) => r.status === "live") ??
    sorted.find((r) => r.status === "upcoming") ??
    null;

  // Next upcoming round after current
  const nextRound = currentRound
    ? (sorted.find(
        (r) =>
          r.status === "upcoming" && r.sessionId !== currentRound.sessionId,
      ) ?? null)
    : null;

  const hasLive = sorted.some((r) => r.status === "live");
  const hasUpcoming = sorted.some((r) => r.status === "upcoming");
  const status = hasLive ? "live" : hasUpcoming ? "upcoming" : "completed";

  const completedRounds = sorted.filter(
    (r) => r.status === "ended" || r.isSettled,
  ).length;

  return {
    seasonId,
    coinSymbol: prizeRound.coinSymbol,
    rounds: sorted,
    leaderboardId,
    prizeRound,
    currentRound,
    nextRound,
    status,
    totalRounds: sorted.length,
    completedRounds,
    entryFeeRaw: prizeRound.entryFeeRaw,
    totalPrizePoolRaw: prizeRound.totalPoolRaw,
    creatorAddress: prizeRound.creatorAddress,
  };
}
