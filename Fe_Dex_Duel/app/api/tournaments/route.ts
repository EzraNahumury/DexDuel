/**
 * GET /api/tournaments
 *
 * Query params:
 *   status  — UPCOMING | LIVE | FINISHED | CANCELED (legacy: PENDING | ACTIVE | ENDED | SETTLED)
 *   q       — search coinSymbol (substring) or exact roundId number
 *   limit   — default 20, max 100
 *   cursor  — opaque pagination cursor (round.id from previous response)
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { serializeRound } from "@/lib/serialize";
import type { RoundStatus } from "@prisma/client";
import { getAdminAddress } from "@/src/server/auth/requireAdmin";

const STATUS_MAP: Record<string, RoundStatus> = {
  PENDING: "UPCOMING",
  ACTIVE: "LIVE",
  ENDED: "FINISHED",
  SETTLED: "FINISHED",
  UPCOMING: "UPCOMING",
  LIVE: "LIVE",
  FINISHED: "FINISHED",
  CANCELED: "CANCELED",
};

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const q = sp.get("q")?.trim();
    const limit = Math.min(Math.max(1, Number(sp.get("limit") ?? 20)), 100);
    const cursor = sp.get("cursor"); // id (string) of the last seen round
    const includeHidden = sp.get("includeHidden") === "1";

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> =
      includeHidden && getAdminAddress(req)
        ? {}
        : { isHidden: false };

    if (status && STATUS_MAP[status]) {
      const mapped = STATUS_MAP[status];
      if (mapped === "FINISHED") {
        where.OR = [{ status: "FINISHED" }, { status: "SETTLED" }];
      } else {
        where.status = mapped;
      }
    }

    if (q) {
      where.OR = [
        { roundId: q },
        { coinSymbol: { contains: q, mode: "insensitive" } },
      ];
    }

    if (cursor) {
      where.id = { gt: cursor }; // forward cursor pagination
    }

    const rows = await prisma.round.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: limit + 1, // fetch one extra to determine hasNextPage
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? data[data.length - 1]?.id ?? null : null;

    return Response.json({
      ok: true,
      data: data.map(serializeRound),
      nextCursor,
      hasNextPage,
      total: data.length,
    });
  } catch (error) {
    console.error("[GET /api/tournaments]", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
