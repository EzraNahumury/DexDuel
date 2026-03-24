import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const now = await prisma.$queryRaw`SELECT NOW()`;
        return Response.json({ ok: true, now });
    } catch (error) {
        return Response.json(
            { ok: false, error: String(error) },
            { status: 500 }
        );
    }
}
