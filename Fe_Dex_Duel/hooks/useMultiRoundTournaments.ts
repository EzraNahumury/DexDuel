"use client";

import { useMemo } from "react";
import { useOnChainTournaments, type OnChainTournament } from "@/hooks/useOnChainTournaments";
import { buildTournamentGroup, type TournamentGroup } from "@/lib/tournamentGroup";

export type { TournamentGroup };

export function useMultiRoundTournaments() {
  const roundsQuery = useOnChainTournaments();

  const tournaments = useMemo((): TournamentGroup[] => {
    const rounds = roundsQuery.data ?? [];
    if (rounds.length === 0) return [];

    const bySeasonId = new Map<number, OnChainTournament[]>();
    for (const round of rounds) {
      const list = bySeasonId.get(round.seasonId) ?? [];
      list.push(round);
      bySeasonId.set(round.seasonId, list);
    }

    return Array.from(bySeasonId.entries())
      .map(([sId, roundList]) => buildTournamentGroup(sId, roundList))
      .filter((g): g is TournamentGroup => g !== null)
      .sort((a, b) => b.prizeRound.startTimeMs - a.prizeRound.startTimeMs);
  }, [roundsQuery.data]);

  return { ...roundsQuery, data: tournaments };
}
