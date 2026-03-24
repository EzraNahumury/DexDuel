import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { serializeRound } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/src/server/auth/requireAdmin";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) {
      return Response.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const includeHidden = req.nextUrl.searchParams.get("includeHidden") === "1";
    const where: Prisma.RoundWhereInput = includeHidden
      ? {}
      : ({ isHidden: false } as Prisma.RoundWhereInput);

    const rows = await prisma.round.findMany({
      where,
      orderBy: { startTime: "desc" },
    });

    return Response.json({
      ok: true,
      data: rows.map(serializeRound),
      total: rows.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/tournaments]", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
