"use client";

import { useQuery } from "@tanstack/react-query";

export interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export interface FinnhubCandles {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: string;
  t: number[];
  v: number[];
}

export interface FinnhubSymbol {
  description: string;
  displaySymbol: string;
  symbol: string;
}

function buildSearchParams(input: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    params.set(key, String(value));
  }
  return params.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export function toFinnhubSymbol(coinSymbol: string): string {
  return `BINANCE:${coinSymbol.toUpperCase()}USDT`;
}

export function useMarketQuote(symbol?: string) {
  return useQuery({
    queryKey: ["market-quote", symbol ?? ""],
    queryFn: () =>
      fetchJson<FinnhubQuote>(`/api/market/quote?${buildSearchParams({ symbol: symbol ?? "" })}`),
    enabled: Boolean(symbol),
    refetchInterval: 1_000,
  });
}

export function useMarketCandles(symbol?: string, resolution = "5", hours = 6) {
  return useQuery({
    queryKey: ["market-candles", symbol ?? "", resolution, hours],
    queryFn: () => {
      const to = Math.floor(Date.now() / 1000);
      const from = to - Math.max(1, hours) * 60 * 60;
      const query = buildSearchParams({
        symbol: symbol ?? "",
        resolution,
        from,
        to,
      });
      return fetchJson<FinnhubCandles>(`/api/market/candles?${query}`);
    },
    enabled: Boolean(symbol),
    refetchInterval: 45_000,
  });
}

function extractBaseSymbol(symbol: FinnhubSymbol): string {
  const display = symbol.displaySymbol?.toUpperCase() ?? "";
  if (display.includes("/")) {
    return display.split("/")[0];
  }

  const raw = symbol.symbol?.toUpperCase() ?? "";
  const colonIndex = raw.indexOf(":");
  const pair = colonIndex >= 0 ? raw.slice(colonIndex + 1) : raw;
  const suffix = "USDT";
  if (pair.endsWith(suffix) && pair.length > suffix.length) {
    return pair.slice(0, pair.length - suffix.length);
  }

  return pair;
}

/** Fetch the close price closest to a given timestamp, trying progressively coarser resolutions. */
export function useMarketPriceAt(symbol?: string, timestampMs?: number) {
  return useQuery({
    queryKey: ["market-price-at", symbol ?? "", timestampMs ?? 0],
    queryFn: async () => {
      if (!symbol || !timestampMs) return null;
      // Try finer → coarser resolutions so old rounds still resolve
      const attempts: { resolution: string; windowMin: number }[] = [
        { resolution: "1",  windowMin: 15   },
        { resolution: "5",  windowMin: 60   },
        { resolution: "15", windowMin: 180  },
        { resolution: "60", windowMin: 720  },
        { resolution: "D",  windowMin: 2880 },
      ];
      const targetSec = Math.floor(timestampMs / 1000);
      for (const { resolution, windowMin } of attempts) {
        const to = targetSec + 120;
        const from = to - windowMin * 60;
        const params = new URLSearchParams({ symbol, resolution, from: String(from), to: String(to) });
        try {
          const res = await fetch(`/api/market/candles?${params}`, { cache: "no-store" });
          if (!res.ok) continue;
          const data = await res.json() as FinnhubCandles;
          if (!data.c?.length || data.s !== "ok") continue;
          let closest = 0, minDiff = Infinity;
          for (let i = 0; i < data.t.length; i++) {
            const diff = Math.abs(data.t[i] - targetSec);
            if (diff < minDiff) { minDiff = diff; closest = i; }
          }
          return data.c[closest] ?? null;
        } catch { continue; }
      }
      return null;
    },
    enabled: Boolean(symbol && timestampMs && timestampMs > 0),
    // Keep retrying every 20s until we get a price (Finnhub has ~1-2 min indexing delay)
    staleTime: (q) => (q.state.data === null ? 20_000 : 10 * 60 * 1000),
    refetchInterval: (q) => (q.state.data === null ? 20_000 : false),
    retry: 3,
  });
}

export function useMarketSymbols(exchange = "BINANCE", quote = "USDT") {
  return useQuery({
    queryKey: ["market-symbols", exchange, quote],
    queryFn: async () => {
      const query = buildSearchParams({ exchange, quote });
      const symbols = await fetchJson<FinnhubSymbol[]>(`/api/market/symbols?${query}`);

      const uniqueBase = new Set<string>();
      for (const symbol of symbols) {
        const base = extractBaseSymbol(symbol).trim().toUpperCase();
        if (base) uniqueBase.add(base);
      }

      return Array.from(uniqueBase.values()).sort((a, b) => a.localeCompare(b));
    },
    refetchInterval: 6 * 60 * 60 * 1000,
  });
}
