/**
 * Transaction builders for SC_Dex_Duel smart contract interactions.
 *
 * All function signatures map 1-to-1 with the Move contract entrypoints.
 * Targets are read from onechainConfig — never hardcoded.
 */

import { Transaction } from "@onelabs/sui/transactions";
import { onechainConfig, modules } from "@/src/config/onechain";
import type { ObjectId, DirectionValue } from "@/src/types/onechain";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toAsciiBytes(input: string): number[] {
  return Array.from(input.toUpperCase()).map((c) => c.charCodeAt(0));
}

const clock = () => onechainConfig.clockId;
const treasury = () => onechainConfig.treasuryId;

// ─── Admin: Create ─────────────────────────────────────────────────────────

export interface InitializeTournamentParams {
  seasonId: number;
}

/**
 * game_controller::initialize_tournament
 * Creates a Leaderboard for the season. Call once per season.
 */
export function buildInitializeTournamentTx(
  params: InitializeTournamentParams
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(15_000_000);
  tx.moveCall({
    target: `${modules.gameController}::initialize_tournament`,
    arguments: [tx.pure.u64(params.seasonId)],
  });
  return tx;
}

export interface CreateGameSessionParams {
  roundId: number;              // u64 numeric ID (auto-generated via Date.now())
  seasonId: number;
  coinSymbol: string;           // e.g. "BTC"
  startTimeMs: number;
  endTimeMs: number;
  entryFeeRaw: number;          // raw USDT (6 decimals)
  minParticipants: number;
  earlyWindowMinutes: number;   // early prediction bonus window
  maxWindowMinutes: number;     // prediction lock window
}

/**
 * game_controller::create_game_session
 * Creates Round + PredictionRegistry + GameSession shared objects.
 */
export function buildCreateGameSessionTx(
  params: CreateGameSessionParams
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(35_000_000);
  tx.moveCall({
    target: `${modules.gameController}::create_game_session`,
    arguments: [
      tx.pure.u64(params.roundId),
      tx.pure.u64(params.seasonId),
      tx.pure.vector("u8", toAsciiBytes(params.coinSymbol)),
      tx.pure.u64(params.startTimeMs),
      tx.pure.u64(params.endTimeMs),
      tx.pure.u64(params.entryFeeRaw),
      tx.pure.u64(params.minParticipants),
      tx.pure.u64(params.earlyWindowMinutes),
      tx.pure.u64(params.maxWindowMinutes),
    ],
  });
  return tx;
}

// ─── Admin: Start ────────────────────────────────────────────────────────────

export interface StartGameParams {
  roundObjectId: ObjectId;    // 0x... address of the Round shared object
  priceStartRaw: number;      // live price scaled by 1e8
}

/**
 * game_controller::start_game
 * Starts the round with the current live price.
 */
export function buildStartGameTx(params: StartGameParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  tx.moveCall({
    target: `${modules.gameController}::start_game`,
    arguments: [
      tx.object(params.roundObjectId),
      tx.pure.u64(params.priceStartRaw),
      tx.object(clock()),
    ],
  });
  return tx;
}

// ─── Admin: Complete (end + rank + lock) ────────────────────────────────────

export interface CompleteGameParams {
  sessionObjectId: ObjectId;
  roundObjectId: ObjectId;
  registryObjectId: ObjectId;
  leaderboardObjectId: ObjectId;
  priceEndRaw: number;
  top3Players: ObjectId[];     // [rank1, rank2, rank3] (up to 3 entries)
}

/**
 * game_controller::complete_game
 * Ends the round, sets winner direction, ranks top-3 players, locks registry.
 */
export function buildCompleteGameTx(params: CompleteGameParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(20_000_000);
  tx.moveCall({
    target: `${modules.gameController}::complete_game`,
    arguments: [
      tx.object(params.sessionObjectId),
      tx.object(params.roundObjectId),
      tx.object(params.registryObjectId),
      tx.object(params.leaderboardObjectId),
      tx.pure.u64(params.priceEndRaw),
      tx.pure.vector("address", params.top3Players),
      tx.object(clock()),
    ],
  });
  return tx;
}

// ─── Admin: Settle ───────────────────────────────────────────────────────────

export interface SettleGameParams {
  roundObjectId: ObjectId;
}

/**
 * game_controller::settle_game
 * Locks the prize pool. Must be called after complete_game.
 */
export function buildSettleGameTx(params: SettleGameParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  tx.moveCall({
    target: `${modules.gameController}::settle_game`,
    arguments: [
      tx.object(params.roundObjectId),
      tx.object(treasury()),
    ],
  });
  return tx;
}

// ─── Admin: Cancel ───────────────────────────────────────────────────────────

export interface CancelTournamentParams {
  sessionObjectId: ObjectId;
  roundObjectId: ObjectId;
}

/**
 * game_controller::cancel_tournament
 * Only the round owner can call this.
 */
export function buildCancelTournamentTx(
  params: CancelTournamentParams
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  tx.moveCall({
    target: `${modules.gameController}::cancel_tournament`,
    arguments: [
      tx.object(params.sessionObjectId),
      tx.object(params.roundObjectId),
      tx.object(clock()),
    ],
  });
  return tx;
}

// ─── User: Join ──────────────────────────────────────────────────────────────

export interface JoinGameParams {
  sessionObjectId: ObjectId;
  roundObjectId: ObjectId;
  registryObjectId: ObjectId;
  direction: DirectionValue;     // 1=UP, 2=DOWN
  usdtCoinObjectId: ObjectId;    // A USDT Coin owned by sender
  entryFeeRaw: number;
}

/**
 * game_controller::join_game
 * User joins a round and submits their prediction.
 */
export function buildJoinGameTx(params: JoinGameParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(15_000_000);

  // Split exact entry fee from user's USDT coin
  const [payment] = tx.splitCoins(tx.object(params.usdtCoinObjectId), [
    tx.pure.u64(params.entryFeeRaw),
  ]);

  tx.moveCall({
    target: `${modules.gameController}::join_game`,
    arguments: [
      tx.object(params.sessionObjectId),
      tx.object(params.roundObjectId),
      tx.object(params.registryObjectId),
      tx.pure.u8(params.direction),
      payment,
      tx.object(clock()),
    ],
  });
  return tx;
}

// ─── User: Claim Rewards ─────────────────────────────────────────────────────

export interface ClaimRewardsParams {
  sessionObjectId: ObjectId;
  roundObjectId: ObjectId;
  senderAddress: ObjectId;
}

/**
 * game_controller::claim_rewards
 * Returns principal + prize (if ranked winner). Rank is read internally.
 */
export function buildClaimRewardsTx(params: ClaimRewardsParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(15_000_000);

  const reward = tx.moveCall({
    target: `${modules.gameController}::claim_rewards`,
    arguments: [
      tx.object(params.sessionObjectId),
      tx.object(params.roundObjectId),
      tx.object(clock()),
    ],
  });

  // Transfer payout coin back to sender
  tx.transferObjects([reward], tx.pure.address(params.senderAddress));
  return tx;
}

// ─── User: Claim Refund (cancelled round) ───────────────────────────────────

export interface ClaimRefundParams {
  roundObjectId: ObjectId;
  senderAddress: ObjectId;
}

/**
 * game_controller::claim_tournament_refund
 * Returns entry fee after round is cancelled.
 */
export function buildClaimRefundTx(params: ClaimRefundParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  tx.moveCall({
    target: `${modules.gameController}::claim_tournament_refund`,
    arguments: [tx.object(params.roundObjectId)],
  });
  return tx;
}

// ─── User: Claim Faucet ──────────────────────────────────────────────────────

/**
 * usdt::claim_faucet
 * Get 100 USDT test tokens.
 */
export function buildClaimFaucetTx(senderAddress: string): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  const usdtCoin = tx.moveCall({
    target: `${modules.usdt}::claim_faucet`,
    arguments: [tx.object(onechainConfig.faucetId)],
  });
  tx.transferObjects([usdtCoin], tx.pure.address(senderAddress));
  return tx;
}
