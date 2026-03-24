import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FALLBACK_FINNHUB_KEY = "d6duoapr01qm89pl1je0d6duoapr01qm89pl1jeg";

function getFinnhubKey(): string {
  return (
    process.env.FINNHUB_API_KEY ||
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
    FALLBACK_FINNHUB_KEY
  );
}

function parseUnixSeconds(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

export async function GET(request: NextRequest) {
  const apiKey = getFinnhubKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim() || "BINANCE:BTCUSDT";
  const resolution = request.nextUrl.searchParams.get("resolution")?.trim() || "5";
  const to = parseUnixSeconds(request.nextUrl.searchParams.get("to"), now);
  const from = parseUnixSeconds(request.nextUrl.searchParams.get("from"), to - 6 * 60 * 60);

  if (from >= to) {
    return NextResponse.json(
      { error: "`from` must be smaller than `to`." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    symbol,
    resolution,
    from: String(from),
    to: String(to),
    token: apiKey,
  });

  const response = await fetch(`${FINNHUB_BASE_URL}/crypto/candle?${params.toString()}`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof payload?.error === "string"
        ? payload.error
        : `Finnhub candles request failed with status ${response.status}`;
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
