/**
 * GET /api/leaderboard
 *
 * Returns Score rows sorted by total score descending, with rank assigned 1-based.
 *
 * Query params:
 *   seasonId — filter by season (optional; omit to return all seasons)
 *   limit    — default 100, max 500
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const sp = req.nextUrl.searchParams;
        const rawSeason = sp.get("seasonId");
        const limit = Math.min(Math.max(1, Number(sp.get("limit") ?? 100)), 500);

        const seasonId = rawSeason
            ? (() => { try { return BigInt(rawSeason); } catch { return null; } })()
            : null;

        const rows = await prisma.score.findMany({
            where: seasonId !== null ? { seasonId } : undefined,
            orderBy: [{ total: "desc" }, { updatedAt: "desc" }],
            take: limit,
        });

        return Response.json({
            ok: true,
            data: rows.map((r, i) => ({
                rank: i + 1,
                seasonId: r.seasonId.toString(),
                player: r.player,
                total: r.total.toString(),
                streak: r.streak.toString(),
                updatedAt: r.updatedAt.toISOString(),
            })),
            total: rows.length,
        });
    } catch (error) {
        console.error("[GET /api/leaderboard]", error);
        return Response.json({ ok: false, error: String(error) }, { status: 500 });
    }
}
