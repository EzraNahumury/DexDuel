import { type NextRequest } from "next/server";
import { requireAdmin } from "@/src/server/auth/requireAdmin";

type ValidatePayload = {
  roundId?: string | number;
  seasonId?: string | number;
  coinSymbol?: string;
  startTime?: string | number;
  endTime?: string | number;
  entryFeeRaw?: string | number;
  earlyWindowMinutes?: number;
};

function parseBigInt(value: unknown, field: string, errors: string[]): bigint | null {
  if (value === null || value === undefined || value === "") {
    errors.push(`${field} is required`);
    return null;
  }
  try {
    return BigInt(value as string | number);
  } catch {
    errors.push(`${field} must be a valid integer`);
    return null;
  }
}

function parseDate(value: unknown, field: string, errors: string[]): Date | null {
  if (value === null || value === undefined || value === "") {
    errors.push(`${field} is required`);
    return null;
  }
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date`);
    return null;
  }
  return date;
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) {
      return Response.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const payload = (await req.json()) as ValidatePayload;
    const errors: string[] = [];

    const roundId = parseBigInt(payload.roundId, "roundId", errors);
    const seasonId = parseBigInt(payload.seasonId, "seasonId", errors);
    const entryFeeRaw = parseBigInt(payload.entryFeeRaw, "entryFeeRaw", errors);
    const startTime = parseDate(payload.startTime, "startTime", errors);
    const endTime = parseDate(payload.endTime, "endTime", errors);

    const coinSymbol = payload.coinSymbol?.trim();
    if (!coinSymbol) {
      errors.push("coinSymbol is required");
    } else if (coinSymbol.length > 16) {
      errors.push("coinSymbol must be 16 chars or less");
    }

    const earlyWindowMinutes = payload.earlyWindowMinutes;
    if (earlyWindowMinutes === null || earlyWindowMinutes === undefined) {
      errors.push("earlyWindowMinutes is required");
    } else if (!Number.isFinite(earlyWindowMinutes) || earlyWindowMinutes < 0) {
      errors.push("earlyWindowMinutes must be a non-negative number");
    } else if (earlyWindowMinutes > 24 * 60) {
      errors.push("earlyWindowMinutes must be <= 1440");
    }

    if (roundId !== null && roundId < 0n) errors.push("roundId must be >= 0");
    if (seasonId !== null && seasonId < 0n) errors.push("seasonId must be >= 0");
    if (entryFeeRaw !== null && entryFeeRaw < 0n) errors.push("entryFeeRaw must be >= 0");

    if (startTime && endTime && endTime <= startTime) {
      errors.push("endTime must be after startTime");
    }

    if (errors.length > 0) {
      return Response.json({ ok: false, error: errors.join("; ") }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/admin/tournaments/validate]", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
