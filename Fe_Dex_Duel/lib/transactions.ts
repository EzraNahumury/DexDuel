import { Transaction } from "@onelabs/sui/transactions";
import { PACKAGE_ID, OBJECT_IDS } from "./constants";

/**
 * Claim 100 USDT from the public faucet.
 */
export function buildClaimFaucetTx(senderAddress: string): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  const usdtCoin = tx.moveCall({
    target: `${PACKAGE_ID}::usdt::claim_faucet`,
    arguments: [tx.object(OBJECT_IDS.FAUCET)],
  });
  tx.transferObjects([usdtCoin], tx.pure.address(senderAddress));
  return tx;
}

/**
 * Join a game session and submit a prediction.
 *
 * @param sessionId        - SharedObject ID of the GameSession
 * @param roundId          - SharedObject ID of the Round
 * @param registryId       - SharedObject ID of the PredictionRegistry
 * @param direction        - 1 = UP, 2 = DOWN
 * @param usdtCoinObjectId - A USDT Coin object owned by the sender (must have >= entryFeeRaw)
 * @param entryFeeRaw      - Entry fee in raw USDT (6 decimals, e.g. 100_000_000 = 100 USDT)
 */
export function buildJoinGameTx(
  sessionId: string,
  roundId: string,
  registryId: string,
  direction: 1 | 2,
  usdtCoinObjectId: string,
  entryFeeRaw: number,
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  // Split exact entry fee from the user's USDT coin
  const [payment] = tx.splitCoins(tx.object(usdtCoinObjectId), [
    tx.pure.u64(entryFeeRaw),
  ]);
  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::join_game`,
    arguments: [
      tx.object(sessionId),
      tx.object(roundId),
      tx.object(registryId),
      tx.pure.u8(direction),
      payment,
      tx.object(OBJECT_IDS.CLOCK),
    ],
  });
  return tx;
}

/**
 * Claim rewards (principal + yield for winners, principal only for losers).
 * SC signature: claim_rewards(session: &GameSession, round: &mut Round, clock: &Clock, ctx)
 * Returns a Coin<USDT> transferred to `senderAddress`.
 */
export function buildClaimRewardTx(
  sessionId: string,
  roundId: string,
  senderAddress: string,
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  const rewardCoin = tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::claim_rewards`,
    arguments: [
      tx.object(sessionId),
      tx.object(roundId),
      tx.object(OBJECT_IDS.CLOCK),
    ],
  });
  tx.transferObjects([rewardCoin], tx.pure.address(senderAddress));
  return tx;
}

/**
 * Batch claim rewards for multiple rounds in a single transaction.
 * Each round's claim_rewards call returns a Coin<USDT>; we merge them
 * into one coin and transfer once to senderAddress.
 */
export function buildBatchClaimRewardTx(
  rounds: Array<{ sessionId: string; roundId: string }>,
  senderAddress: string,
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000 * rounds.length);

  const coins: ReturnType<typeof tx.moveCall>[] = [];
  for (const round of rounds) {
    const rewardCoin = tx.moveCall({
      target: `${PACKAGE_ID}::game_controller::claim_rewards`,
      arguments: [
        tx.object(round.sessionId),
        tx.object(round.roundId),
        tx.object(OBJECT_IDS.CLOCK),
      ],
    });
    coins.push(rewardCoin);
  }

  if (coins.length === 1) {
    tx.transferObjects([coins[0]], tx.pure.address(senderAddress));
  } else if (coins.length > 1) {
    const [primary, ...rest] = coins;
    tx.mergeCoins(primary, rest);
    tx.transferObjects([primary], tx.pure.address(senderAddress));
  }

  return tx;
}

export interface CreateTournamentParams {
  roundId: number;
  seasonId: number;
  coinSymbol: string;
  startTimeMs: number;
  endTimeMs: number;
  entryFeeRaw: number;
  minParticipants: number;
  earlyWindowMinutes: number;
}

export interface StartRoundParams {
  roundId: string;
  priceStartRaw: number;
}

function toAsciiBytes(input: string): number[] {
  return Array.from(input).map((char) => char.charCodeAt(0));
}

/**
 * Admin-only flow:
 * 1) create game session (round + prediction registry + game session)
 * 2) create leaderboard
 * 3) share leaderboard
 */
export function buildCreateTournamentTx(
  params: CreateTournamentParams,
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(35_000_000);

  // max_prediction_window = full tournament duration so users can join any time during the round
  const durationMinutes = Math.max(1, Math.floor((params.endTimeMs - params.startTimeMs) / 60_000));

  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::create_game_session`,
    arguments: [
      tx.pure.u64(params.roundId),
      tx.pure.u64(params.seasonId),
      tx.pure.vector("u8", toAsciiBytes(params.coinSymbol.toUpperCase())),
      tx.pure.u64(params.startTimeMs),
      tx.pure.u64(params.endTimeMs),
      tx.pure.u64(params.entryFeeRaw),
      tx.pure.u64(params.minParticipants),
      tx.pure.u64(params.earlyWindowMinutes), // early bonus window
      tx.pure.u64(durationMinutes),           // max prediction window = full duration
    ],
  });

  const leaderboard = tx.moveCall({
    target: `${PACKAGE_ID}::leaderboard::create_leaderboard`,
    arguments: [tx.pure.u64(params.seasonId)],
  });

  tx.moveCall({
    target: `${PACKAGE_ID}::leaderboard::share_leaderboard`,
    arguments: [leaderboard],
  });

  return tx;
}

/**
 * Batch create a full tournament (multiple rounds) in a single transaction.
 * Creates one leaderboard + N game sessions (rounds).
 */
export function buildCreateTournamentBatchTx(
  rounds: Array<{
    roundId: number;
    seasonId: number;
    coinSymbol: string;
    startTimeMs: number;
    endTimeMs: number;
    entryFeeRaw: number;
    minParticipants: number;
    earlyWindowMinutes: number;
  }>,
): Transaction {
  if (rounds.length === 0) throw new Error("No rounds to create");
  const tx = new Transaction();
  tx.setGasBudget(35_000_000 * rounds.length);

  const seasonId = rounds[0].seasonId;

  // Create leaderboard once for the season
  const leaderboard = tx.moveCall({
    target: `${PACKAGE_ID}::leaderboard::create_leaderboard`,
    arguments: [tx.pure.u64(seasonId)],
  });

  tx.moveCall({
    target: `${PACKAGE_ID}::leaderboard::share_leaderboard`,
    arguments: [leaderboard],
  });

  // Create each round
  for (const round of rounds) {
    const durationMinutes = Math.max(1, Math.floor((round.endTimeMs - round.startTimeMs) / 60_000));

    tx.moveCall({
      target: `${PACKAGE_ID}::game_controller::create_game_session`,
      arguments: [
        tx.pure.u64(round.roundId),
        tx.pure.u64(round.seasonId),
        tx.pure.vector("u8", Array.from(round.coinSymbol).map((c) => c.charCodeAt(0))),
        tx.pure.u64(round.startTimeMs),
        tx.pure.u64(round.endTimeMs),
        tx.pure.u64(round.entryFeeRaw),
        tx.pure.u64(round.minParticipants),
        tx.pure.u64(round.earlyWindowMinutes),
        tx.pure.u64(durationMinutes),
      ],
    });
  }

  return tx;
}

/**
 * Admin-only flow:
 * Start a created round so users can join and submit predictions.
 */
export function buildStartRoundTx(params: StartRoundParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);

  // start_game(round: &mut Round, price_start: u64, clock: &Clock, ctx: &TxContext)
  // Note: no AdminCap required — public fun callable by anyone
  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::start_game`,
    arguments: [
      tx.object(params.roundId),
      tx.pure.u64(params.priceStartRaw),
      tx.object(OBJECT_IDS.CLOCK),
    ],
  });

  return tx;
}

/**
 * Batch start all rounds in a tournament with a single transaction.
 * All rounds share the same priceStartRaw (fetched once).
 */
export function buildBatchStartRoundTx(
  rounds: Array<{ roundId: string }>,
  priceStartRaw: number,
): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000 * rounds.length);

  for (const round of rounds) {
    tx.moveCall({
      target: `${PACKAGE_ID}::game_controller::start_game`,
      arguments: [
        tx.object(round.roundId),
        tx.pure.u64(priceStartRaw),
        tx.object(OBJECT_IDS.CLOCK),
      ],
    });
  }

  return tx;
}

export interface CancelTournamentParams {
  sessionId: string;
  roundId: string;
}

/**
 * Admin-only flow:
 * Cancel an upcoming round or a low-participation live round.
 */
export function buildCancelTournamentTx(params: CancelTournamentParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);

  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::cancel_tournament`,
    arguments: [
      tx.object(params.sessionId),
      tx.object(params.roundId),
      tx.object(OBJECT_IDS.CLOCK),
    ],
  });

  return tx;
}

export interface CompleteGameParams {
  sessionId: string;
  roundId: string;
  registryId: string;
  leaderboardId: string;
  priceEndRaw: number;
  top3Players: string[]; // 0–3 addresses [rank1, rank2, rank3]
}

/**
 * Admin-only flow:
 * Complete a game session — sets winner direction, top-3 ranks, updates leaderboard.
 * SC signature: complete_game(session, round, registry, leaderboard, price_end, top3_players, clock, ctx)
 */
export function buildCompleteGameTx(params: CompleteGameParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(20_000_000);
  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::complete_game`,
    arguments: [
      tx.object(params.sessionId),
      tx.object(params.roundId),
      tx.object(params.registryId),
      tx.object(params.leaderboardId),
      tx.pure.u64(params.priceEndRaw),
      tx.pure.vector("address", params.top3Players),
      tx.object(OBJECT_IDS.CLOCK),
    ],
  });
  return tx;
}

export interface SettleGameParams {
  roundId: string;
}

/**
 * Admin-only flow:
 * Settle a completed game — deducts 10% admin fee to Treasury, locks final_prize_pool.
 * SC signature: settle_game(round, treasury, ctx)
 */
export function buildSettleGameTx(params: SettleGameParams): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);
  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::settle_game`,
    arguments: [
      tx.object(params.roundId),
      tx.object(OBJECT_IDS.TREASURY),
    ],
  });
  return tx;
}

/**
 * Player flow:
 * Claim full entry-fee refund after a cancelled tournament.
 */
export function buildClaimRefundTx(roundId: string): Transaction {
  const tx = new Transaction();
  tx.setGasBudget(10_000_000);

  tx.moveCall({
    target: `${PACKAGE_ID}::game_controller::claim_tournament_refund`,
    arguments: [tx.object(roundId)],
  });

  return tx;
}
