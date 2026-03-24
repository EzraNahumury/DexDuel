/**
 * Event parsers for SC_Dex_Duel on-chain events.
 * Maps raw SuiEvent payloads into typed objects.
 */

import type { SuiEvent } from "@onelabs/sui/client";
import { EVENT_TYPES } from "@/src/config/onechain";
import type {
  RoundCreatedEvent,
  JoinEvent,
  RefundEvent,
  PrizeEvent,
  RoundStatus,
  OnChainRound,
  ObjectId,
} from "@/src/types/onechain";

// ─── Helpers ────────────────────────────────────────────────────────────────

function decodeAscii(bytes: number[] | Uint8Array | string): string {
  if (typeof bytes === "string") return bytes;
  return Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("")
    .replace(/\0/g, "");
}

function toAddress(val: unknown): ObjectId {
  if (typeof val === "string") return val as ObjectId;
  return "0x" as ObjectId;
}

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  if (typeof val === "bigint") return Number(val);
  return 0;
}

// ─── Parsers ────────────────────────────────────────────────────────────────

export function parseRoundCreatedEvent(
  event: SuiEvent
): RoundCreatedEvent | null {
  if (event.type !== EVENT_TYPES.RoundCreated) return null;
  const p = event.parsedJson as Record<string, unknown>;
  return {
    // round_address: Object Address emitted by game_round::RoundCreated
    round_address: toAddress(p.round_address ?? event.id.txDigest),
    round_id: toNum(p.round_id),
    coin_symbol: Array.isArray(p.coin_symbol)
      ? (p.coin_symbol as number[])
      : [],
    start_time: toNum(p.start_time),
    end_time: toNum(p.end_time),
    entry_fee: toNum(p.entry_fee),
  };
}

export function parseJoinEvent(event: SuiEvent): JoinEvent | null {
  if (event.type !== EVENT_TYPES.JoinEvent) return null;
  const p = event.parsedJson as Record<string, unknown>;
  return {
    tournament_id: toNum(p.tournament_id),
    round_id: toNum(p.round_id),
    user: toAddress(p.user),
    amount: toNum(p.amount),
    ts: toNum(p.ts),
  };
}

export function parseRefundEvent(event: SuiEvent): RefundEvent | null {
  if (event.type !== EVENT_TYPES.RefundEvent) return null;
  const p = event.parsedJson as Record<string, unknown>;
  return {
    tournament_id: toNum(p.tournament_id),
    round_id: toNum(p.round_id),
    user: toAddress(p.user),
    principal_amount: toNum(p.principal_amount),
    ts: toNum(p.ts),
  };
}

export function parsePrizeEvent(event: SuiEvent): PrizeEvent | null {
  if (event.type !== EVENT_TYPES.PrizeEvent) return null;
  const p = event.parsedJson as Record<string, unknown>;
  return {
    tournament_id: toNum(p.tournament_id),
    round_id: toNum(p.round_id),
    user: toAddress(p.user),
    prize_amount: toNum(p.prize_amount),
    ts: toNum(p.ts),
  };
}

// ─── Round Object Parser ──────────────────────────────────────────────────────

/**
 * Parse a raw Move object from SuiClient.getObject into an OnChainRound.
 */
export function parseRoundObject(raw: Record<string, unknown>): OnChainRound {
  const fields = (raw.content as Record<string, unknown>)?.fields as Record<
    string,
    unknown
  >;
  const status = fields?.status as Record<string, unknown>;

  const isActive = status?.is_active === true;
  const isEnded = status?.is_ended === true;
  const isSettled = status?.is_settled === true;
  const isCancelled = status?.is_cancelled === true;

  let roundStatus: RoundStatus = "upcoming";
  if (isCancelled) roundStatus = "cancelled";
  else if (isSettled) roundStatus = "settled";
  else if (isEnded) roundStatus = "ended";
  else if (isActive) roundStatus = "live";

  return {
    objectId: toAddress(raw.objectId),
    roundId: toNum(fields?.round_id),
    coinSymbol: decodeAscii(
      (fields?.coin_symbol as number[] | string) ?? ""
    ),
    startTime: toNum(fields?.start_time),
    endTime: toNum(fields?.end_time),
    predictionEndTime: toNum(fields?.prediction_end_time),
    entryFee: toNum(fields?.entry_fee),
    priceStart: toNum(fields?.price_start),
    priceEnd: toNum(fields?.price_end),
    winnerDirection: (toNum(fields?.winner_direction) as 0 | 1 | 2),
    upCount: toNum(fields?.up_count),
    downCount: toNum(fields?.down_count),
    totalParticipants: toNum(fields?.total_participants),
    minParticipants: toNum(fields?.min_participants),
    status: roundStatus,
    isSettled,
    isCancelled,
    admin: toAddress(fields?.admin),
  };
}

// ─── Coin symbol helper ───────────────────────────────────────────────────────

export function decodeCoinSymbol(raw: unknown): string {
  if (Array.isArray(raw)) return decodeAscii(raw as number[]);
  if (typeof raw === "string") return raw;
  return "UNKNOWN";
}
