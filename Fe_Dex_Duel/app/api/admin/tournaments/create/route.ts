import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/src/server/auth/requireAdmin";
import { getDexDuelConfig, requireDexDuelPackageId } from "@/lib/config";

type CreatePayload = {
  pairSymbol?: string;
  startTimeMs?: number;
  endTimeMs?: number;
  seasonNo?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as CreatePayload;
    const pairSymbol = typeof body.pairSymbol === "string" ? body.pairSymbol.trim() : "";
    const startTimeMs = body.startTimeMs;
    const endTimeMs = body.endTimeMs;
    const seasonNo = body.seasonNo;

    if (!pairSymbol) {
      return NextResponse.json({ error: "pairSymbol is required" }, { status: 400 });
    }
    if (!isFiniteNumber(startTimeMs) || !isFiniteNumber(endTimeMs)) {
      return NextResponse.json({ error: "startTimeMs and endTimeMs must be valid numbers" }, { status: 400 });
    }

    const now = Date.now();
    if (endTimeMs <= startTimeMs) {
      return NextResponse.json({ error: "endTimeMs must be greater than startTimeMs" }, { status: 400 });
    }
    if (endTimeMs <= now) {
      return NextResponse.json({ error: "endTimeMs must be in the future" }, { status: 400 });
    }
    if (startTimeMs < now + 30_000) {
      return NextResponse.json({ error: "startTimeMs must be at least 30 seconds in the future" }, { status: 400 });
    }

    if (seasonNo !== undefined && (!isFiniteNumber(seasonNo) || seasonNo < 0)) {
      return NextResponse.json({ error: "seasonNo must be a non-negative number" }, { status: 400 });
    }

    const config = getDexDuelConfig();
    const packageId = requireDexDuelPackageId();
    const target = `${packageId}::${config.moduleName}::${config.createFn}`;

    const args: string[] = [
      pairSymbol,
      Math.floor(startTimeMs).toString(),
      Math.floor(endTimeMs).toString(),
    ];

    if (seasonNo !== undefined) {
      args.push(Math.floor(seasonNo).toString());
    }

    return NextResponse.json({ tx: { target, args } });
  } catch (error) {
    console.error("[POST /api/admin/tournaments/create]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}