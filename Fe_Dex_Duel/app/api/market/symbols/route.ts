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

export async function GET(request: NextRequest) {
  const apiKey = getFinnhubKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const exchange = request.nextUrl.searchParams.get("exchange")?.trim() || "BINANCE";
  const quote = (request.nextUrl.searchParams.get("quote")?.trim() || "USDT").toUpperCase();

  const params = new URLSearchParams({
    exchange,
    token: apiKey,
  });

  const response = await fetch(`${FINNHUB_BASE_URL}/crypto/symbol?${params.toString()}`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof payload?.error === "string"
        ? payload.error
        : `Finnhub symbols request failed with status ${response.status}`;
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  const items = Array.isArray(payload) ? payload : [];
  const normalized = items.filter((item) => {
    const symbol = typeof item?.symbol === "string" ? item.symbol.toUpperCase() : "";
    return symbol.endsWith(quote);
  });

  return NextResponse.json(normalized, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
