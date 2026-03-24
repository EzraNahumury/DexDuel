/**
 * GET /api/tournaments/[roundId]/predictions
 *
 * Returns predictions for a given round, newest first.
 *
 * Query params:
 *   limit — default 50, max 200
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ roundId: string }> },
) {
    try {
        const { roundId: rawId } = await params;
        const roundId = BigInt(rawId);
        const limit = Math.min(
            Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)),
            200,
        );

        const predictions = await prisma.prediction.findMany({
            where: { roundId },
            orderBy: { time: "desc" },
            take: limit,
        });

        return Response.json({
            ok: true,
            data: predictions.map((p) => ({
                id: p.id,
                roundId: p.roundId.toString(),
                player: p.player,
                direction: p.direction,   // 1=UP, 2=DOWN
                stakeRaw: p.stakeRaw.toString(),
                time: p.time.toISOString(),
                isEarly: p.isEarly,
                isCorrect: p.isCorrect ?? null,
                rank: p.rank ?? null,
                txDigest: p.txDigest ?? null,
            })),
            total: predictions.length,
        });
    } catch (error) {
        console.error("[GET /api/tournaments/[roundId]/predictions]", error);
        return Response.json({ ok: false, error: String(error) }, { status: 500 });
    }
}
