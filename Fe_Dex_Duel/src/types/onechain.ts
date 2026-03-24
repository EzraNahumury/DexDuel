/**
 * Type definitions for OneChain integration.
 * All on-chain IDs use the 0x-prefixed hex address format.
 */

/** A 0x-prefixed hex string representing an on-chain object address. */
export type ObjectId = `0x${string}`;

/** The package ID on OneChain. */
export type PackageId = ObjectId;

/** Direction constants matching the smart contract (1=UP, 2=DOWN). */
export const Direction = {
  UP: 1 as const,
  DOWN: 2 as const,
} as const;

export type DirectionValue = (typeof Direction)[keyof typeof Direction];

/** Status of a Round inferred from on-chain state flags. */
export type RoundStatus =
  | "upcoming"   // created, not yet started
  | "live"       // started, accepting predictions
  | "ended"      // price_end set, not yet settled
  | "settled"    // settle_round called, prizes locked
  | "cancelled"; // cancel_round called

/** On-chain Round object fields exposed to the frontend. */
export interface OnChainRound {
  objectId: ObjectId;
  roundId: number;          // u64 from contract
  coinSymbol: string;
  startTime: number;        // ms timestamp
  endTime: number;          // ms timestamp
  predictionEndTime: number;
  entryFee: number;
  priceStart: number;
  priceEnd: number;
  winnerDirection: 0 | 1 | 2;
  upCount: number;
  downCount: number;
  totalParticipants: number;
  minParticipants: number;
  status: RoundStatus;
  isSettled: boolean;
  isCancelled: boolean;
  admin: ObjectId;         // creator/owner address
}

/** Event: RoundCreated emitted by game_round::create_round */
export interface RoundCreatedEvent {
  round_address: ObjectId; // Object ID of the Round
  round_id: number;
  coin_symbol: number[];   // ASCII bytes
  start_time: number;
  end_time: number;
  entry_fee: number;
}

/** Event: JoinEvent emitted by game_controller::join_game (relayer) */
export interface JoinEvent {
  tournament_id: number;
  round_id: number;
  user: ObjectId;
  amount: number;
  ts: number;
}

/** Event: RefundEvent emitted by game_controller::claim_rewards (relayer) */
export interface RefundEvent {
  tournament_id: number;
  round_id: number;
  user: ObjectId;
  principal_amount: number;
  ts: number;
}

/** Event: PrizeEvent emitted by game_controller::claim_rewards (relayer) */
export interface PrizeEvent {
  tournament_id: number;
  round_id: number;
  user: ObjectId;
  prize_amount: number;
  ts: number;
}

/** User status for a specific round. */
export interface UserRoundStatus {
  isParticipant: boolean;
  hasClaimed: boolean;
  hasRefunded: boolean;
}
