"use client";

import { useSuiClient } from "@onelabs/dapp-kit";
import type { SuiClient, SuiEvent, SuiObjectData } from "@onelabs/sui/client";
import { useQuery } from "@tanstack/react-query";
import { PACKAGE_ID } from "@/lib/constants";

export type TournamentStatus = "live" | "upcoming" | "ended" | "cancelled";

export interface OnChainTournament {
  sessionId: string;
  roundObjectId: string;
  registryId: string;
  leaderboardId: string | null;
  txDigest: string;
  createdAtMs: number;
  seasonId: number;
  roundNumber: number;
  coinSymbol: string;
  entryFeeRaw: number;
  startTimeMs: number;
  endTimeMs: number;
  upCount: number;
  downCount: number;
  totalParticipants: number;
  totalPoolRaw: number;
  yieldPoolRaw: number;
  winnerDirection: number;
  priceStart: number;
  priceEnd: number;
  isActive: boolean;
  isCancelled: boolean;
  isSettled: boolean;
  finalPrizePool: number;
  minParticipants: number;
  status: TournamentStatus;
  creatorAddress: string;
}

export interface JoinGameEvent {
  txDigest: string;
  timestampMs: number;
  sessionId: string;
  roundNumber: number;
  player: string;
  direction: 1 | 2;
  amountRaw: number;
}

export interface WinnerRankEvent {
  txDigest: string;
  timestampMs: number;
  roundNumber: number;
  player: string;
  rank: 1 | 2 | 3;
}

type SessionDraft = {
  sessionId: string;
  roundObjectId: string;
  registryId: string;
  leaderboardId: string | null;
  txDigest: string;
  createdAtMs: number;
  seasonIdFromEvent: number;
  roundNumberFromEvent: number;
  startTimeFromEvent: number;
  endTimeFromEvent: number;
  creatorAddress: string;
};

type ParsedRound = {
  roundNumber: number;
  coinSymbol: string;
  startTimeMs: number;
  endTimeMs: number;
  entryFeeRaw: number;
  upCount: number;
  downCount: number;
  totalParticipants: number;
  totalPoolRaw: number;
  yieldPoolRaw: number;
  winnerDirection: number;
  priceStart: number;
  priceEnd: number;
  isActive: boolean;
  isEnded: boolean;
  isSettled: boolean;
  isCancelled: boolean;
  minParticipants: number;
  finalPrizePool: number;
};

const OBJECT_TYPES = {
  session: `${PACKAGE_ID}::game_controller::GameSession`,
  round: `${PACKAGE_ID}::game_round::Round`,
  registry: `${PACKAGE_ID}::prediction::PredictionRegistry`,
  leaderboard: `${PACKAGE_ID}::leaderboard::Leaderboard`,
} as const;

const EVENT_TYPES = {
  sessionCreated: `${PACKAGE_ID}::game_controller::GameSessionCreated`,
  joinedGame: `${PACKAGE_ID}::game_controller::PlayerJoinedGame`,
  predictionRankSet: `${PACKAGE_ID}::prediction::PredictionResultSet`,
  rewardClaimed: `${PACKAGE_ID}::game_round::RewardClaimed`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "bigint") return Number(value);
  return fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return false;
}

function readBalanceValue(value: unknown): number {
  if (!isRecord(value)) return toNumber(value);
  return toNumber(value.value);
}

function decodeAsciiVector(value: unknown): string {
  if (typeof value === "string") return value.toUpperCase();
  if (Array.isArray(value)) {
    const chars = value
      .map((item) => toNumber(item))
      .filter((code) => Number.isFinite(code) && code > 0 && code < 256)
      .map((code) => String.fromCharCode(code));
    const result = chars.join("").trim();
    return result ? result.toUpperCase() : "UNKNOWN";
  }
  return "UNKNOWN";
}

function statusFromTimes(
  nowMs: number,
  startTimeMs: number,
  endTimeMs: number,
  isActive: boolean,
  isEnded: boolean,
  isSettled: boolean,
  isCancelled: boolean,
): TournamentStatus {
  if (isCancelled) return "cancelled";
  if (isSettled || isEnded || (endTimeMs > 0 && nowMs >= endTimeMs)) return "ended";
  // Active on-chain but start time hasn't arrived yet → treat as upcoming
  if (isActive && startTimeMs > 0 && nowMs < startTimeMs) return "upcoming";
  if (isActive) return "live";
  if (startTimeMs > 0 && nowMs < startTimeMs) return "upcoming";
  return "upcoming";
}

function getCreatedObjectId(
  objectChanges: Array<{ type: string; objectType?: string; objectId?: string }>,
  objectType: string,
): string | null {
  const created = objectChanges.find(
    (change) =>
      change.type === "created" &&
      typeof change.objectType === "string" &&
      change.objectType === objectType &&
      typeof change.objectId === "string",
  );
  return created?.objectId ?? null;
}

function getAllCreatedObjectIds(
  objectChanges: Array<{ type: string; objectType?: string; objectId?: string }>,
  objectType: string,
): string[] {
  return objectChanges
    .filter(
      (change) =>
        change.type === "created" &&
        typeof change.objectType === "string" &&
        change.objectType === objectType &&
        typeof change.objectId === "string",
    )
    .map((change) => change.objectId!);
}

function parseRound(roundData: SuiObjectData): ParsedRound | null {
  const content = roundData.content;
  if (!content || content.dataType !== "moveObject") return null;
  if (!isRecord(content.fields)) return null;

  const fields = content.fields as Record<string, unknown>;
  const rawStatus = fields["status"];
  const statusFields = isRecord(rawStatus)
    ? (isRecord(rawStatus.fields) ? (rawStatus.fields as Record<string, unknown>) : (rawStatus as Record<string, unknown>))
    : {};

  function readBool(obj: Record<string, unknown>, key: string): boolean {
    const val = obj[key];
    if (val === undefined || val === null) return false;
    return toBoolean(val);
  }

  return {
    roundNumber: toNumber(fields["round_id"]),
    coinSymbol: decodeAsciiVector(fields["coin_symbol"]),
    startTimeMs: toNumber(fields["start_time"]),
    endTimeMs: toNumber(fields["end_time"]),
    entryFeeRaw: toNumber(fields["entry_fee"]),
    upCount: toNumber(fields["up_count"]),
    downCount: toNumber(fields["down_count"]),
    totalParticipants: toNumber(fields["total_participants"]),
    totalPoolRaw: readBalanceValue(fields["total_pool"]),
    yieldPoolRaw: readBalanceValue(fields["yield_pool"]),
    winnerDirection: toNumber(fields["winner_direction"]),
    priceStart: toNumber(fields["price_start"]),
    priceEnd: toNumber(fields["price_end"]),
    minParticipants: toNumber(fields["min_participants"]),
    finalPrizePool: toNumber(fields["final_prize_pool"]),
    isActive: readBool(statusFields, "is_active") || readBool(statusFields, "isActive"),
    isEnded: readBool(statusFields, "is_ended") || readBool(statusFields, "isEnded"),
    isSettled: readBool(statusFields, "is_settled") || readBool(statusFields, "isSettled"),
    isCancelled: readBool(statusFields, "is_cancelled") || readBool(statusFields, "isCancelled"),
  };
}

async function fetchCreateSessionTransactions(client: SuiClient) {
  const allTransactions: Awaited<ReturnType<SuiClient["queryTransactionBlocks"]>>["data"] = [];
  let cursor: string | null | undefined = undefined;

  for (let i = 0; i < 5; i += 1) {
    const page = await client.queryTransactionBlocks({
      filter: {
        MoveFunction: {
          package: PACKAGE_ID,
          module: "game_controller",
          function: "create_game_session",
        },
      },
      options: { showObjectChanges: true, showEvents: true, showInput: true },
      limit: 20,
      order: "descending",
      cursor,
    });

    allTransactions.push(...page.data);
    if (!page.hasNextPage) break;
    cursor = page.nextCursor;
    if (!cursor) break;
  }

  return allTransactions;
}

async function fetchOnChainTournaments(client: SuiClient): Promise<OnChainTournament[]> {
  const transactions = await fetchCreateSessionTransactions(client);

  const drafts: SessionDraft[] = [];
  for (const tx of transactions) {
    const objectChanges = (tx.objectChanges ?? []) as Array<{
      type: string;
      objectType?: string;
      objectId?: string;
    }>;

    const sessionIds = getAllCreatedObjectIds(objectChanges, OBJECT_TYPES.session);
    const roundObjectIds = getAllCreatedObjectIds(objectChanges, OBJECT_TYPES.round);
    const registryIds = getAllCreatedObjectIds(objectChanges, OBJECT_TYPES.registry);
    const leaderboardId = getCreatedObjectId(objectChanges, OBJECT_TYPES.leaderboard);

    // Collect all GameSessionCreated events from this TX
    const sessionEvents = (tx.events ?? []).filter(
      (event) => event.type === EVENT_TYPES.sessionCreated,
    );

    // Pair sessions/rounds/registries by index (created in order)
    const count = Math.min(sessionIds.length, roundObjectIds.length, registryIds.length);
    if (count === 0) continue;

    for (let i = 0; i < count; i++) {
      const eventJson = (isRecord(sessionEvents[i]?.parsedJson) ? sessionEvents[i].parsedJson : {}) as Record<string, unknown>;

      drafts.push({
        sessionId: sessionIds[i],
        roundObjectId: roundObjectIds[i],
        registryId: registryIds[i],
        leaderboardId,
        txDigest: tx.digest,
        createdAtMs: toNumber(tx.timestampMs),
        seasonIdFromEvent: toNumber(eventJson.season_id),
        roundNumberFromEvent: toNumber(eventJson.round_id),
        startTimeFromEvent: toNumber(eventJson.start_time),
        endTimeFromEvent: toNumber(eventJson.end_time),
        creatorAddress: tx.transaction?.data.sender ?? "0x",
      });
    }
  }

  if (drafts.length === 0) return [];

  const uniqueRoundIds = Array.from(new Set(drafts.map((draft) => draft.roundObjectId)));
  const roundObjects = await client.multiGetObjects({
    ids: uniqueRoundIds,
    options: { showContent: true, showType: true },
  });

  const roundById = new Map<string, ParsedRound>();
  for (const objectResponse of roundObjects) {
    const data = objectResponse.data;
    if (!data?.objectId) continue;
    const parsedRound = parseRound(data);
    if (!parsedRound) continue;
    roundById.set(data.objectId, parsedRound);
  }

  const now = Date.now();
  const deduped = new Map<string, OnChainTournament>();

  for (const draft of drafts) {
    const round = roundById.get(draft.roundObjectId);
    if (!round) continue;

    const tournament: OnChainTournament = {
      sessionId: draft.sessionId,
      roundObjectId: draft.roundObjectId,
      registryId: draft.registryId,
      leaderboardId: draft.leaderboardId,
      txDigest: draft.txDigest,
      createdAtMs: draft.createdAtMs,
      seasonId: draft.seasonIdFromEvent || 0,
      roundNumber: round.roundNumber || draft.roundNumberFromEvent || 0,
      coinSymbol: round.coinSymbol,
      entryFeeRaw: round.entryFeeRaw,
      startTimeMs: round.startTimeMs || draft.startTimeFromEvent,
      endTimeMs: round.endTimeMs || draft.endTimeFromEvent,
      upCount: round.upCount,
      downCount: round.downCount,
      totalParticipants: round.totalParticipants,
      totalPoolRaw: round.totalPoolRaw,
      yieldPoolRaw: round.yieldPoolRaw,
      winnerDirection: round.winnerDirection,
      priceStart: round.priceStart,
      priceEnd: round.priceEnd,
      isActive: round.isActive,
      isCancelled: round.isCancelled,
      isSettled: round.isSettled,
      finalPrizePool: round.finalPrizePool,
      minParticipants: round.minParticipants,
      status: statusFromTimes(
        now,
        round.startTimeMs || draft.startTimeFromEvent,
        round.endTimeMs || draft.endTimeFromEvent,
        round.isActive,
        round.isEnded,
        round.isSettled,
        round.isCancelled,
      ),
      creatorAddress: draft.creatorAddress,
    };

    deduped.set(tournament.sessionId.toLowerCase(), tournament);
  }

  return Array.from(deduped.values()).sort((a, b) => b.startTimeMs - a.startTimeMs);
}

function parseJoinEvent(event: SuiEvent): JoinGameEvent | null {
  if (event.type !== EVENT_TYPES.joinedGame) return null;
  const parsed = isRecord(event.parsedJson) ? event.parsedJson : null;
  if (!parsed) return null;

  const direction = toNumber(parsed.direction);
  if (direction !== 1 && direction !== 2) return null;

  const player = typeof parsed.player === "string" ? parsed.player : "";
  if (!player) return null;

  return {
    txDigest: event.id.txDigest,
    timestampMs: toNumber(event.timestampMs),
    sessionId: typeof parsed.session_id === "string" ? parsed.session_id : "",
    roundNumber: toNumber(parsed.round_id),
    player,
    direction,
    amountRaw: toNumber(parsed.amount),
  };
}

function parseWinnerRankEvent(event: SuiEvent): WinnerRankEvent | null {
  if (event.type !== EVENT_TYPES.predictionRankSet) return null;
  const parsed = isRecord(event.parsedJson) ? event.parsedJson : null;
  if (!parsed) return null;

  const rank = toNumber(parsed.rank);
  if (rank !== 1 && rank !== 2 && rank !== 3) return null;

  const player = typeof parsed.player === "string" ? parsed.player : "";
  if (!player) return null;

  return {
    txDigest: event.id.txDigest,
    timestampMs: toNumber(event.timestampMs),
    roundNumber: toNumber(parsed.round_id),
    player,
    rank,
  };
}

export function useOnChainTournaments() {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["onchain-tournaments", PACKAGE_ID],
    queryFn: () => fetchOnChainTournaments(client),
    refetchInterval: 5_000,
  });
}

export function useRoundJoinEvents(roundNumber?: number) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["round-join-events", PACKAGE_ID, roundNumber ?? "all"],
    queryFn: async () => {
      const page = await client.queryEvents({
        query: { MoveEventType: EVENT_TYPES.joinedGame },
        limit: 200,
        order: "descending",
      });

      const parsedEvents = page.data
        .map(parseJoinEvent)
        .filter((event): event is JoinGameEvent => event !== null);

      if (typeof roundNumber !== "number") return parsedEvents;
      return parsedEvents.filter((event) => event.roundNumber === roundNumber);
    },
    refetchInterval: 5_000,
  });
}

export function useWinnerRankEvents(roundNumber?: number) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["winner-rank-events", PACKAGE_ID, roundNumber ?? "all"],
    queryFn: async () => {
      const page = await client.queryEvents({
        query: { MoveEventType: EVENT_TYPES.predictionRankSet },
        limit: 200,
        order: "descending",
      });

      const parsedEvents = page.data
        .map(parseWinnerRankEvent)
        .filter((event): event is WinnerRankEvent => event !== null);

      if (typeof roundNumber !== "number") return parsedEvents;
      return parsedEvents.filter((event) => event.roundNumber === roundNumber);
    },
    refetchInterval: 5_000,
  });
}

export function usePlayerJoinEvents(address?: string) {
  const normalizedAddress = address?.toLowerCase() ?? "";
  const eventsQuery = useRoundJoinEvents();

  if (!normalizedAddress) {
    return {
      ...eventsQuery,
      data: [] as JoinGameEvent[],
    };
  }

  return {
    ...eventsQuery,
    data: (eventsQuery.data ?? []).filter(
      (event) => event.player.toLowerCase() === normalizedAddress,
    ),
  };
}

export function usePlayerWinnerRankEvents(address?: string) {
  const normalizedAddress = address?.toLowerCase() ?? "";
  const eventsQuery = useWinnerRankEvents();

  if (!normalizedAddress) {
    return {
      ...eventsQuery,
      data: [] as WinnerRankEvent[],
    };
  }

  return {
    ...eventsQuery,
    data: (eventsQuery.data ?? []).filter(
      (event) => event.player.toLowerCase() === normalizedAddress,
    ),
  };
}

/* ─── Reward Claimed Events ────────────────────────────────────────── */

export interface RewardClaimEvent {
  txDigest: string;
  timestampMs: number;
  roundNumber: number;
  player: string;
}

function parseRewardClaimEvent(event: SuiEvent): RewardClaimEvent | null {
  if (event.type !== EVENT_TYPES.rewardClaimed) return null;
  const parsed = isRecord(event.parsedJson) ? event.parsedJson : null;
  if (!parsed) return null;

  const player = typeof parsed.player === "string" ? parsed.player : "";
  if (!player) return null;

  return {
    txDigest: event.id.txDigest,
    timestampMs: toNumber(event.timestampMs),
    roundNumber: toNumber(parsed.round_id),
    player,
  };
}

export function useRewardClaimEvents() {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["reward-claim-events", PACKAGE_ID],
    queryFn: async () => {
      const page = await client.queryEvents({
        query: { MoveEventType: EVENT_TYPES.rewardClaimed },
        limit: 200,
        order: "descending",
      });

      return page.data
        .map(parseRewardClaimEvent)
        .filter((event): event is RewardClaimEvent => event !== null);
    },
    refetchInterval: 5_000,
  });
}

export function usePlayerClaimEvents(address?: string) {
  const normalizedAddress = address?.toLowerCase() ?? "";
  const eventsQuery = useRewardClaimEvents();

  if (!normalizedAddress) {
    return {
      ...eventsQuery,
      data: [] as RewardClaimEvent[],
    };
  }

  return {
    ...eventsQuery,
    data: (eventsQuery.data ?? []).filter(
      (event) => event.player.toLowerCase() === normalizedAddress,
    ),
  };
}
