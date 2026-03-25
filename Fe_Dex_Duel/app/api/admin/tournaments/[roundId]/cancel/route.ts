import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/src/server/auth/requireAdmin";
import { prisma } from "@/lib/db";
import { getDexDuelConfig, requireDexDuelPackageId } from "@/lib/config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> },
) {
  try {
    const auth = requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { roundId } = await params;
    const chainRoundId = roundId?.trim();
    if (!chainRoundId) {
      return NextResponse.json({ error: "roundId is required" }, { status: 400 });
    }

    const round = await prisma.round.findFirst({ where: { chainRoundId: BigInt(chainRoundId) } });
    if (!round) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // NEW: Ownership validation
    // If the round has an ownerAddress, only that address can cancel it.
    if (round.ownerAddress && round.ownerAddress.toLowerCase() !== auth.address.toLowerCase()) {
      return NextResponse.json({ error: "You are not the owner of this tournament" }, { status: 403 });
    }

    if (round.status !== "UPCOMING") {
      return NextResponse.json({ error: "Only UPCOMING tournaments can be canceled" }, { status: 400 });
    }

    const now = new Date();
    if (round.startTime <= now) {
      return NextResponse.json({ error: "Tournament startTime must be in the future to cancel" }, { status: 400 });
    }

    const config = getDexDuelConfig();
    const packageId = requireDexDuelPackageId();
    const target = `${packageId}::${config.moduleName}::${config.cancelFn}`;
    const args = [chainRoundId];

    return NextResponse.json({ tx: { target, args } });
  } catch (error) {
    console.error("[POST /api/admin/tournaments/[roundId]/cancel]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
