"use client";

import { useSuiClientQuery } from "@onelabs/dapp-kit";
import { USDT_TYPE, formatUSDT } from "@/lib/constants";
import type { CoinStruct } from "@onelabs/sui/client";

export interface USDTBalance {
  raw: bigint;
  formatted: string;           // e.g. "250.00"
  coins: CoinStruct[];         // individual coin objects (for building txns)
  largestCoin: CoinStruct | undefined;  // coin with highest balance (best for splitting)
}

/**
 * Returns the wallet's USDT balance, refetched every 10s.
 * `coins` are needed to pick a coin object ID for join_game.
 */
export function useUSDTBalance(address: string | undefined) {
  const { data, isLoading, refetch } = useSuiClientQuery(
    "getCoins",
    { owner: address ?? "", coinType: USDT_TYPE },
    { enabled: !!address, refetchInterval: 10_000 },
  );

  if (!data) {
    return { balance: undefined, isLoading, refetch };
  }

  const coins = data.data;
  const raw = coins.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
  const largestCoin = coins.reduce<CoinStruct | undefined>((best, c) => {
    if (!best) return c;
    return BigInt(c.balance) > BigInt(best.balance) ? c : best;
  }, undefined);

  const balance: USDTBalance = {
    raw,
    formatted: formatUSDT(raw),
    coins,
    largestCoin,
  };

  return { balance, isLoading, refetch };
}
