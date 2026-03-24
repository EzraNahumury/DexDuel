"use client";

import { useSuiClient } from "@onelabs/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { PACKAGE_ID } from "@/lib/constants";

export interface LeaderboardRow {
  rank: number;
  player: string;
  totalScore: number;
  winEvents: number;
  currentStreak: number;
  updateEvents: number;
  lastUpdateMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "bigint") return Number(value);
  return 0;
}

export function useLeaderboardRows() {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["leaderboard-score-events", PACKAGE_ID],
    queryFn: async () => {
      const eventType = `${PACKAGE_ID}::leaderboard::ScoreUpdated`;
      const page = await client.queryEvents({
        query: { MoveEventType: eventType },
        limit: 400,
        order: "descending",
      });

      const rowsByPlayer = new Map<string, Omit<LeaderboardRow, "rank">>();

      for (const event of page.data) {
        const parsedJson = isRecord(event.parsedJson) ? event.parsedJson : null;
        if (!parsedJson) continue;

        const player = typeof parsedJson.player === "string" ? parsedJson.player : "";
        if (!player) continue;

        const key = player.toLowerCase();
        const pointsEarned = toNumber(parsedJson.points_earned);
        const newTotalScore = toNumber(parsedJson.new_total_score);
        const currentStreak = toNumber(parsedJson.current_streak);
        const lastUpdateMs = toNumber(event.timestampMs);

        const current = rowsByPlayer.get(key);
        if (!current) {
          rowsByPlayer.set(key, {
            player,
            totalScore: newTotalScore,
            winEvents: pointsEarned > 0 ? 1 : 0,
            currentStreak,
            updateEvents: 1,
            lastUpdateMs,
          });
          continue;
        }

        current.totalScore = Math.max(current.totalScore, newTotalScore);
        current.currentStreak = Math.max(current.currentStreak, currentStreak);
        current.updateEvents += 1;
        if (pointsEarned > 0) current.winEvents += 1;
        current.lastUpdateMs = Math.max(current.lastUpdateMs, lastUpdateMs);
      }

      return Array.from(rowsByPlayer.values())
        .sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return b.lastUpdateMs - a.lastUpdateMs;
        })
        .map((row, index) => ({
          rank: index + 1,
          ...row,
        }));
    },
    refetchInterval: 15_000,
  });
}
