/**
 * GET /api/tournaments/[roundId]
 *
 * Returns full Round details by its on-chain Object Address (0x...).
 * The [roundId] segment is the round's blockchain Object ID (String).
 */

import { prisma } from "@/lib/db";
import { serializeRound } from "@/lib/serialize";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ roundId: string }> },
) {
    try {
        const { roundId } = await params;

        // roundId is now a String Object Address (e.g. "0x89ab...")
        const round = await prisma.round.findUnique({ where: { roundId } });
        if (!round) {
            return Response.json({ ok: false, error: "Tournament not found" }, { status: 404 });
        }

        return Response.json({
            ok: true,
            data: serializeRound(round),
        });
    } catch (error) {
        console.error("[GET /api/tournaments/[roundId]]", error);
        return Response.json({ ok: false, error: String(error) }, { status: 500 });
    }
}
