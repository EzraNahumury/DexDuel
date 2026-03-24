/**
 * OneChain config — single source of truth for all NEXT_PUBLIC_* env vars.
 * Import from here instead of accessing process.env directly.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[OneChain Config] Missing required environment variable: ${key}\n` +
      `Please add it to your .env.local file.`
    );
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const onechainConfig = {
  /** The OneChain RPC endpoint. */
  rpc: optionalEnv("NEXT_PUBLIC_ONECHAIN_RPC", "https://rpc-testnet.onelabs.cc:443"),

  /** The network name (testnet / mainnet). */
  network: optionalEnv("NEXT_PUBLIC_NETWORK", "testnet"),

  /** The deployed package ID of SC_Dex_Duel. */
  packageId: optionalEnv(
    "NEXT_PUBLIC_PACKAGE_ID",
    "0xa8317c6e62c5bbd0d43470f311df3921444bb79bdb90ccb2021e2736d7284edc"
  ),

  /** The Treasury shared object ID (game_round::Treasury). */
  treasuryId: optionalEnv(
    "NEXT_PUBLIC_TREASURY_OBJECT_ID",
    "0x438eed9a4e71112adf70c144162346e0d7aacc8c1b8c5f7484fb8207d8f1c406"
  ),

  /** The USDT coin type string. */
  usdtType: optionalEnv(
    "NEXT_PUBLIC_USDT_TYPE",
    "0xa8317c6e62c5bbd0d43470f311df3921444bb79bdb90ccb2021e2736d7284edc::usdt::USDT"
  ),

  /** Faucet shared object ID (optional). */
  faucetId: optionalEnv(
    "NEXT_PUBLIC_FAUCET_OBJECT_ID",
    "0x33466a03e67241b0ab2b230e9616370f0266decb6a493f8fa3a2c4f4ac8a2a52"
  ),

  /** AdminCap object ID (owned by deployer wallet). */
  adminCapId: optionalEnv(
    "NEXT_PUBLIC_ADMIN_CAP_ID",
    "0x018c82200546305ca5ec3f0181c9794125b4b37ca604740aa82a8376f46695cd"
  ),

  /** Sui/OneChain Clock system object ID. */
  clockId: "0x6" as const,
} as const;

/** Convenience: full module targets */
export const modules = {
  gameController: `${onechainConfig.packageId}::game_controller`,
  gameRound:      `${onechainConfig.packageId}::game_round`,
  prediction:     `${onechainConfig.packageId}::prediction`,
  leaderboard:    `${onechainConfig.packageId}::leaderboard`,
  usdt:           `${onechainConfig.packageId}::usdt`,
} as const;

/** Event type strings for querying on-chain events */
export const EVENT_TYPES = {
  // game_round events
  RoundCreated:    `${modules.gameRound}::RoundCreated`,
  RoundEnded:      `${modules.gameRound}::RoundEnded`,
  RoundSettled:    `${modules.gameRound}::RoundSettled`,
  RoundCancelled:  `${modules.gameRound}::RoundCancelled`,
  RewardClaimed:   `${modules.gameRound}::RewardClaimed`,
  RefundClaimed:   `${modules.gameRound}::RefundClaimed`,

  // game_controller events
  GameSessionCreated: `${modules.gameController}::GameSessionCreated`,
  PlayerJoinedGame:   `${modules.gameController}::PlayerJoinedGame`,
  GameCompleted:      `${modules.gameController}::GameCompleted`,
  TournamentCancelled:`${modules.gameController}::TournamentCancelled`,

  // Relayer events
  JoinEvent:   `${modules.gameController}::JoinEvent`,
  RefundEvent: `${modules.gameController}::RefundEvent`,
  PrizeEvent:  `${modules.gameController}::PrizeEvent`,

  // prediction events
  PredictionRecorded:  `${modules.prediction}::PredictionRecorded`,
  PredictionResultSet: `${modules.prediction}::PredictionResultSet`,

  // leaderboard events
  ScoreUpdated: `${modules.leaderboard}::ScoreUpdated`,
  SeasonEnded:  `${modules.leaderboard}::SeasonEnded`,
} as const;
