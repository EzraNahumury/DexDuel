import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FALLBACK_FINNHUB_KEY = "d6duoapr01qm89pl1je0d6duoapr01qm89pl1jeg";

function getFinnhubKey(): string {
  return (
    process.env.FINNHUB_API_KEY ||
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
    FALLBACK_FINNHUB_KEY
  );
}

// ── CoinGecko coin ID map (no API key needed) ──────────────────────
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  NEAR: "near",
  APT: "aptos",
  SUI: "sui",
  ARB: "arbitrum",
  OP: "optimism",
};

async function fetchCoinGeckoPriceAt(
  coinSymbol: string,
  targetMs: number,
): Promise<number | null> {
  const id = COINGECKO_IDS[coinSymbol.toUpperCase()];
  if (!id) return null;

  // Use a ±5-minute window; CoinGecko returns per-minute prices for short ranges
  const from = Math.floor(targetMs / 1000) - 300;
  const to   = Math.floor(targetMs / 1000) + 300;

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const prices = data.prices as [number, number][] | undefined;
    if (!prices?.length) return null;

    // Find closest price to target timestamp
    let best = prices[0];
    let minDiff = Math.abs(prices[0][0] - targetMs);
    for (const p of prices) {
      const diff = Math.abs(p[0] - targetMs);
      if (diff < minDiff) { minDiff = diff; best = p; }
    }
    return best[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchFinnhubPriceAt(
  symbol: string,
  targetSec: number,
): Promise<number | null> {
  const attempts = [
    { resolution: "1",  windowMin: 15   },
    { resolution: "5",  windowMin: 60   },
    { resolution: "15", windowMin: 180  },
    { resolution: "60", windowMin: 720  },
    { resolution: "D",  windowMin: 2880 },
  ];

  for (const { resolution, windowMin } of attempts) {
    const to   = targetSec + 120;
    const from = to - windowMin * 60;
    const params = new URLSearchParams({
      symbol, resolution,
      from: String(from), to: String(to),
      token: getFinnhubKey(),
    });
    try {
      const res = await fetch(
        `${FINNHUB_BASE_URL}/crypto/candle?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.c?.length || data.s !== "ok") continue;
      let closest = 0, minDiff = Infinity;
      for (let i = 0; i < data.t.length; i++) {
        const diff = Math.abs(data.t[i] - targetSec);
        if (diff < minDiff) { minDiff = diff; closest = i; }
      }
      const price = data.c[closest];
      if (typeof price === "number" && price > 0) return price;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * GET /api/rounds/price
 * Returns the persisted end price for a round.
 * Priority: DB → on-chain priceEnd (via caller) → Finnhub → CoinGecko
 *
 * Query params:
 *   roundObjectId  – on-chain object address of the round
 *   symbol         – Finnhub symbol (e.g. BINANCE:BTCUSDT)
 *   coinSymbol     – raw coin symbol (e.g. BTC) for CoinGecko fallback
 *   endTimeMs      – round end timestamp in milliseconds
 *   priceStart     – raw on-chain priceStart (1e8 units, integer string)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roundObjectId = searchParams.get("roundObjectId");
  const symbol        = searchParams.get("symbol");
  const coinSymbol    = searchParams.get("coinSymbol") ?? "";
  const endTimeMsStr  = searchParams.get("endTimeMs");
  const priceStartStr = searchParams.get("priceStart") ?? "0";

  if (!roundObjectId || !symbol || !endTimeMsStr) {
    return NextResponse.json(
      { error: "Missing params: roundObjectId, symbol, endTimeMs" },
      { status: 400 },
    );
  }

  const endTimeMs     = Number(endTimeMsStr);
  const priceStartRaw = Number(priceStartStr);

  function buildResult(priceEndUsd: number, source: string) {
    const priceEndRaw = BigInt(Math.round(priceEndUsd * 1e8));
    const winnerDir   = priceStartRaw > 0
      ? (priceEndRaw > BigInt(priceStartRaw) ? 1 : 2)
      : 0;
    return { priceEnd: priceEndUsd, winnerDir, source };
  }

  // ── 1. DB-first ───────────────────────────────────────────────────
  try {
    const row = await prisma.round.findUnique({
      where: { roundId: roundObjectId },
      select: { priceEnd: true, winnerDir: true },
    });
    if (row?.priceEnd != null) {
      const priceEndRaw = Number(row.priceEnd);
      const priceEndUsd = priceEndRaw / 1e8;
      let winnerDir = row.winnerDir ?? 0;
      if (winnerDir === 0 && priceStartRaw > 0) {
        winnerDir = priceEndRaw > priceStartRaw ? 1 : 2;
      }
      return NextResponse.json(
        { priceEnd: priceEndUsd, winnerDir, source: "db" },
        { headers: { "Cache-Control": "public, max-age=3600" } },
      );
    }
  } catch { /* DB unavailable */ }

  // ── 2. Finnhub ────────────────────────────────────────────────────
  const targetSec = Math.floor(endTimeMs / 1000);
  let priceEndUsd = await fetchFinnhubPriceAt(symbol, targetSec);
  let source = "finnhub";

  // ── 3. CoinGecko fallback ─────────────────────────────────────────
  if (priceEndUsd == null) {
    priceEndUsd = await fetchCoinGeckoPriceAt(coinSymbol, endTimeMs);
    source = "coingecko";
  }

  if (priceEndUsd == null) {
    return NextResponse.json(
      { priceEnd: null, winnerDir: 0, source: "none" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = buildResult(priceEndUsd, source);

  // ── 4. Persist to DB ──────────────────────────────────────────────
  try {
    await prisma.round.updateMany({
      where: { roundId: roundObjectId },
      data: {
        priceEnd:  BigInt(Math.round(priceEndUsd * 1e8)),
        winnerDir: result.winnerDir,
      },
    });
  } catch { /* DB write failed — still return the price */ }

  return NextResponse.json(
    result,
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
