import { SuiClient } from "@onelabs/sui/client";
import { getDexDuelConfig } from "../../lib/config.ts";

const fallbackPackageId =
    "0x24a6e095d2ebbfcfc4491f93e1bbb68ebef3e16740e90dfcc290d2feefe6ce6b";

const { packageId, moduleName } = getDexDuelConfig();

export const PACKAGE_ID = packageId || fallbackPackageId;
export const DEXDUEL_MODULE = moduleName || "dexduel";

export const CHAIN_RPC =
    process.env.NEXT_PUBLIC_CHAIN_RPC ??
    process.env.NEXT_PUBLIC_ONECHAIN_RPC ??
    "https://rpc-testnet.onelabs.cc:443";

/**
 * Singleton SuiClient used by the indexer.
 * Constructed once at module load time — safe for long-running processes.
 */
export const chainClient = new SuiClient({ url: CHAIN_RPC });

/** Modules to poll, in dependency order. */
export const MODULES_TO_POLL = [
    "game_round",
    "prediction",
    "game_controller",
    "leaderboard",
    DEXDUEL_MODULE,
] as const;

export type PolledModule = (typeof MODULES_TO_POLL)[number];
