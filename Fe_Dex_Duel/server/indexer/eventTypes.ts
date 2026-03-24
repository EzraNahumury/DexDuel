import { DEXDUEL_MODULE, PACKAGE_ID } from "./chainClient.ts";

/**
 * Full qualified Move event types emitted by the DexDuel smart contract.
 */
export const EVENT_TYPES = {
    // game_round module
    RoundCreated: `${PACKAGE_ID}::game_round::RoundCreated`,
    RoundEnded: `${PACKAGE_ID}::game_round::RoundEnded`,
    RoundSettled: `${PACKAGE_ID}::game_round::RoundSettled`,
    // prediction module
    PredictionRecorded: `${PACKAGE_ID}::prediction::PredictionRecorded`,
    PredictionResultSet: `${PACKAGE_ID}::prediction::PredictionResultSet`,
    // game_controller module
    RewardClaimed: `${PACKAGE_ID}::game_controller::RewardClaimed`,
    // leaderboard module
    ScoreUpdated: `${PACKAGE_ID}::leaderboard::ScoreUpdated`,
    SeasonEnded: `${PACKAGE_ID}::leaderboard::SeasonEnded`,
    // dexduel module (new tournament lifecycle)
    TournamentCreated: `${PACKAGE_ID}::${DEXDUEL_MODULE}::TournamentCreated`,
    TournamentStarted: `${PACKAGE_ID}::${DEXDUEL_MODULE}::TournamentStarted`,
    TournamentEnded: `${PACKAGE_ID}::${DEXDUEL_MODULE}::TournamentEnded`,
    TournamentSettled: `${PACKAGE_ID}::${DEXDUEL_MODULE}::TournamentSettled`,
    TournamentCancelled: `${PACKAGE_ID}::${DEXDUEL_MODULE}::TournamentCancelled`,
} as const;

export type EventTypeName = keyof typeof EVENT_TYPES;
export type EventTypeValue = (typeof EVENT_TYPES)[EventTypeName];
