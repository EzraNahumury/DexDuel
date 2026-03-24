import { prisma } from "@/lib/db";
import { serializeRound } from "@/lib/serialize";

export async function GET() {
    const rounds = await prisma.round.findMany({
        orderBy: { roundId: "desc" },
        take: 20,
    });
    return Response.json({ ok: true, rounds: rounds.map(serializeRound) });
}
