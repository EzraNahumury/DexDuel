import { onechainConfig } from "@/src/config/onechain";

export const PACKAGE_ID = onechainConfig.packageId;

export const OBJECT_IDS = {
  FAUCET: onechainConfig.faucetId,
  ADMIN_CAP: onechainConfig.adminCapId,
  TREASURY: onechainConfig.treasuryId,
  CLOCK: onechainConfig.clockId,
};

export const MODULES = {
  USDT: `${PACKAGE_ID}::usdt`,
  GAME_ROUND: `${PACKAGE_ID}::game_round`,
  PREDICTION: `${PACKAGE_ID}::prediction`,
  LEADERBOARD: `${PACKAGE_ID}::leaderboard`,
  GAME_CONTROLLER: `${PACKAGE_ID}::game_controller`,
} as const;

export const USDT_TYPE = onechainConfig.usdtType;
/** @deprecated use USDT_TYPE */
export const OUSDT_TYPE = USDT_TYPE;

/**
 * Synced with SC-Dex-Duel/README.md frontend configuration block.
 */
export const SC_DEX_DUEL_CONFIG = {
  NETWORK: "testnet",
  PACKAGE_ID,
  FAUCET_ID: OBJECT_IDS.FAUCET,
  TREASURY_ID: OBJECT_IDS.TREASURY,
  ADMIN_CAP_ID: OBJECT_IDS.ADMIN_CAP,
  CLOCK_ID: OBJECT_IDS.CLOCK,
  USDT_COIN_TYPE: USDT_TYPE,
} as const;
export const FAUCET_AMOUNT_USDT = 100;
export const FAUCET_AMOUNT_RAW = 100_000_000; // 6 decimals
export const USDT_DECIMALS = 6;

export const DIRECTION = {
  UP: 1,
  DOWN: 2,
} as const;

export const ROUND_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  ENDED: "ended",
  SETTLED: "settled",
} as const;

export const SCORING = {
  POINTS_WIN: 10,
  POINTS_WIN_STREAK: 5,
  POINTS_EARLY: 3,
} as const;

export const REWARD_DISTRIBUTION = {
  ADMIN_FEE_BPS: 1000, // 10%
  RANK1_BPS: 5000, // 50% of net
  RANK2_BPS: 3000, // 30% of net
  RANK3_BPS: 2000, // 20% of net
} as const;

export const NETWORK = {
  TESTNET_RPC: "https://rpc-testnet.onelabs.cc:443",
  TESTNET_CHAIN_ID: "one-testnet",
};

const DEFAULT_CREATE_TOURNAMENT_ADMINS = [
  // Deployer/admin wallet from latest publish log (DexDuel_SC/p.txt).
  "0x75db71a5b41d5b2600d5b4c1fb1dcf217c6f34979a51e22e714d9d96c9e518a8",
] as const;

function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}

function loadCreateTournamentAdmins(): string[] {
  const raw = process.env.NEXT_PUBLIC_CREATE_TOURNAMENT_ADMINS;
  if (!raw) return [...DEFAULT_CREATE_TOURNAMENT_ADMINS];

  const parsed = raw
    .split(",")
    .map((addr) => normalizeAddress(addr))
    .filter((addr) => addr.startsWith("0x") && addr.length > 2);

  return parsed.length > 0 ? parsed : [...DEFAULT_CREATE_TOURNAMENT_ADMINS];
}

export const CREATE_TOURNAMENT_ADMINS = loadCreateTournamentAdmins();

const LOCAL_ADMINS_KEY = "dexduel_registered_admins";

export function getRegisteredAdmins(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_ADMINS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function registerAdmin(address: string) {
  if (typeof window === "undefined") return;
  const current = getRegisteredAdmins();
  const normalized = normalizeAddress(address);
  if (!current.includes(normalized)) {
    localStorage.setItem(
      LOCAL_ADMINS_KEY,
      JSON.stringify([...current, normalized]),
    );
  }
}

export function isCreateTournamentAdmin(address?: string | null): boolean {
  return !!address;
}

export const EXPLORER_BASE = "https://explorer.onechain.io";

/**
 * Active game session configs — populate after admin deploys sessions on-chain.
 */
export interface GameSessionConfig {
  sessionId: string;
  roundId: string;
  registryId: string;
  leaderboardId: string;
  coinSymbol: string;
  entryFeeRaw: number;
  startTime: number;
  endTime: number;
}

export const ACTIVE_GAME_SESSIONS: GameSessionConfig[] = [];

export function formatUSDT(raw: number | bigint): string {
  const n = typeof raw === "bigint" ? Number(raw) : raw;
  return (n / 10 ** USDT_DECIMALS).toFixed(2);
}

export function toRawUSDT(amount: number): number {
  return Math.floor(amount * 10 ** USDT_DECIMALS);
}

export function shortenAddress(addr: string, chars = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}
