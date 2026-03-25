import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { serializeRound } from "@/lib/serialize";
import { requireAdmin } from "@/src/server/auth/requireAdmin";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) {
      return Response.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const includeHidden = req.nextUrl.searchParams.get("includeHidden") === "1";
    const where = includeHidden ? {} : { isHidden: false };

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
