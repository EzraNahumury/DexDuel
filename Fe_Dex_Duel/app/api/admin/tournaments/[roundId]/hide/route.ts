import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { serializeRound } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/src/server/auth/requireAdmin";

type HidePayload = {
  hidden?: boolean;
  reason?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> },
) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) {
      return Response.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const { roundId: rawId } = await params;
    let roundId: bigint;
    try {
      roundId = BigInt(rawId);
    } catch {
      return Response.json({ ok: false, error: "Invalid roundId" }, { status: 400 });
    }

    const payload = (await req.json()) as HidePayload;
    if (typeof payload.hidden !== "boolean") {
      return Response.json({ ok: false, error: "hidden must be boolean" }, { status: 400 });
    }

    const reason =
      typeof payload.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason.trim()
        : null;

    const data: Prisma.RoundUpdateInput = payload.hidden
      ? ({ isHidden: true, hiddenAt: new Date(), hiddenReason: reason } as Prisma.RoundUpdateInput)
      : ({ isHidden: false, hiddenAt: null, hiddenReason: null } as Prisma.RoundUpdateInput);

    const round = await prisma.round.update({
      where: { roundId },
      data,
    });

    return Response.json({ ok: true, data: serializeRound(round) });
  } catch (error) {
    if (String(error).includes("Record to update not found")) {
      return Response.json({ ok: false, error: "Tournament not found" }, { status: 404 });
    }
    console.error("[PATCH /api/admin/tournaments/[roundId]/hide]", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
