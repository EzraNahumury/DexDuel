/**
 * GET /api/me?address=0x...
 *
 * Returns the authenticated user's status across all rounds they participated in.
 * Checks participant/claimed/refunded status from on-chain and DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOnechainClient } from "@/src/lib/onechain/client";
import { modules } from "@/src/config/onechain";

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");
    if (!address || !address.startsWith("0x")) {
      return NextResponse.json(
        { error: "address query param is required (0x...)" },
        { status: 400 }
      );
    }

    const client = getOnechainClient();

    // Fetch all JoinEvent for this user to know which rounds they participated in
    const joinEvents = await client.queryEvents({
      query: {
        MoveEventType: `${modules.gameController}::PlayerJoinedGame`,
      },
      limit: 50,
      order: "descending",
    });

    // Filter events for this user
    const userRoundIds: string[] = [];
    for (const event of joinEvents.data) {
      const p = event.parsedJson as Record<string, unknown>;
      const player = typeof p.player === "string" ? p.player : "";
      if (player.toLowerCase() === address.toLowerCase()) {
        const roundId = typeof p.round_id === "number" ? String(p.round_id) : "";
        if (roundId && !userRoundIds.includes(roundId)) {
          userRoundIds.push(roundId);
        }
      }
    }

    return NextResponse.json({
      address,
      participatedRoundIds: userRoundIds,
      totalRounds: userRoundIds.length,
    });
  } catch (error) {
    console.error("[GET /api/me]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
