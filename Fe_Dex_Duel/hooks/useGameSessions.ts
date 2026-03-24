"use client";

import { useSuiClientQuery } from "@onelabs/dapp-kit";
import { PACKAGE_ID } from "@/lib/constants";

export interface OnChainGameSession {
  sessionId: string;    // GameSession object ID (from event)
  roundId: string;      // populated separately
  registryId: string;   // populated separately
  season_id: number;
  start_time: number;   // ms
  end_time: number;     // ms
  coin_symbol: string;
  txDigest: string;
}

/**
 * Queries the last 50 GameSessionCreated events from chain.
 * Returns raw event data — caller resolves object IDs as needed.
 */
export function useGameSessionEvents() {
  return useSuiClientQuery(
    "queryEvents",
    {
      query: { MoveEventType: `${PACKAGE_ID}::game_controller::GameSessionCreated` },
      limit: 50,
      order: "descending",
    },
    { refetchInterval: 15_000 },
  );
}

/**
 * Reads a specific Round shared object to get live state.
 */
export function useRoundObject(roundId: string | undefined) {
  return useSuiClientQuery(
    "getObject",
    {
      id: roundId ?? "",
      options: { showContent: true, showType: true },
    },
    { enabled: !!roundId, refetchInterval: 8_000 },
  );
}

/**
 * Reads a specific GameSession shared object.
 */
export function useGameSessionObject(sessionId: string | undefined) {
  return useSuiClientQuery(
    "getObject",
    {
      id: sessionId ?? "",
      options: { showContent: true },
    },
    { enabled: !!sessionId, refetchInterval: 30_000 },
  );
}
