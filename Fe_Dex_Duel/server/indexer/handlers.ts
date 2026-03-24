/**
 * handlers.ts — Materializes on-chain Move events into the Postgres database.
 *
 * Each handler is responsible for one event type.  They are pure DB writes —
 * no chain RPC calls happen here.
 */

import type { SuiEvent } from "@onelabs/sui/client";
import { prisma } from "../../lib/db.ts";
import { EVENT_TYPES } from "./eventTypes.ts";
import {
    decodeCoinSymbol,
    isRecord,
    toBigInt,
    toDate,
    toNumber,
    toPlayer,
} from "./utils.ts";

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ────────────────────────────────────────────────────────────────────────────

export async function dispatchEvent(event: SuiEvent): Promise<void> {
    const payload = isRecord(event.parsedJson) ? event.parsedJson : null;
    if (!payload) return;

    switch (event.type) {
        case EVENT_TYPES.RoundCreated:
            await handleRoundCreated(payload, event);
            break;
        case EVENT_TYPES.RoundEnded:
            await handleRoundEnded(payload);
            break;
        case EVENT_TYPES.RoundSettled:
            await handleRoundSettled(payload);
            break;
        case EVENT_TYPES.TournamentCreated:
            await handleTournamentCreated(payload, event);
            break;
        case EVENT_TYPES.TournamentStarted:
            await handleTournamentStarted(payload);
            break;
        case EVENT_TYPES.TournamentEnded:
            await handleTournamentEnded(payload);
            break;
        case EVENT_TYPES.TournamentSettled:
            await handleTournamentSettled(payload);
            break;
        case EVENT_TYPES.TournamentCancelled:
            await handleTournamentCancelled(payload);
            break;
        case EVENT_TYPES.PredictionRecorded:
            await handlePredictionRecorded(payload, event);
            break;
        case EVENT_TYPES.PredictionResultSet:
            await handlePredictionResultSet(payload);
            break;
        case EVENT_TYPES.RewardClaimed:
            await handleRewardClaimed(payload, event);
            break;
        case EVENT_TYPES.ScoreUpdated:
            await handleScoreUpdated(payload, event);
            break;
        case EVENT_TYPES.SeasonEnded:
            await handleSeasonEnded(payload, event);
            break;
        default:
            // Silently ignore unknown event types emitted by the same modules
            break;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Individual handlers
// ────────────────────────────────────────────────────────────────────────────

function toStringValue(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(Math.floor(value));
    if (typeof value === "bigint") return value.toString();
    return "";
}

function inferCoinSymbol(pairSymbol: string, fallback: string): string {
    const trimmed = pairSymbol.trim();
    if (trimmed.includes("/")) {
        return trimmed.split("/")[0]?.trim().toUpperCase() || fallback;
    }
    return trimmed.toUpperCase() || fallback;
}

async function handleRoundCreated(p: Record<string, unknown>, event: SuiEvent) {
    const roundAddress = toStringValue(p.round_address || p.round_id); // Primary link: Object Address
    const chainRoundId = toBigInt(p.round_id); // Numeric reference
    const coinSymbol = decodeCoinSymbol(p.coin_symbol);
    const startTime = toDate(p.start_time);
    const endTime = toDate(p.end_time);
    const entryFee = toBigInt(p.entry_fee);
    const pairSymbol = coinSymbol || "UNKNOWN";
    const ownerAddress = event.sender;

    await prisma.round.upsert({
        where: { roundId: roundAddress },
        create: {
            roundId: roundAddress,
            chainRoundId: chainRoundId,
            coinSymbol,
            pairSymbol,
            startTime,
            endTime,
            entryFee,
            status: "UPCOMING",
            ownerAddress,
        },
        update: { 
            chainRoundId: chainRoundId, 
            coinSymbol, 
            pairSymbol, 
            startTime, 
            endTime, 
            entryFee, 
            ownerAddress 
        },
    });
}

async function handleRoundEnded(p: Record<string, unknown>) {
    const chainRoundId = toBigInt(p.round_id);
    await prisma.round.updateMany({
        where: { chainRoundId },
        data: {
            priceStart: toBigInt(p.price_start),
            priceEnd: toBigInt(p.price_end),
            winnerDir: toNumber(p.winner_direction),
            status: "FINISHED",
        },
    });
}

async function handleRoundSettled(p: Record<string, unknown>) {
    const chainRoundId = toBigInt(p.round_id);
    await prisma.round.updateMany({
        where: { chainRoundId },
        data: {
            totalYield: toBigInt(p.total_yield),
            adminFee: toBigInt(p.admin_fee),
            prizePool: toBigInt(p.prize_pool),
            status: "FINISHED",
        },
    });
}

async function handleTournamentCreated(p: Record<string, unknown>, event: SuiEvent) {
    const roundAddress = toStringValue(p.round_address || p.round_id);
    const chainRoundId = toBigInt(p.round_id);
    
    const pairSymbol =
        toStringValue(p.pair_symbol) ||
        toStringValue(p.pairSymbol) ||
        decodeCoinSymbol(p.coin_symbol) ||
        "UNKNOWN";
    const coinSymbol = inferCoinSymbol(pairSymbol, decodeCoinSymbol(p.coin_symbol));
    const startTime = toDate(p.start_time ?? p.startTime);
    const endTime = toDate(p.end_time ?? p.endTime);
    const entryFee = toBigInt(p.entry_fee ?? p.entryFee);
    const seasonNoRaw = p.season_no ?? p.season_id ?? p.seasonNo;
    const chainSeasonNo = seasonNoRaw === undefined || seasonNoRaw === null
        ? null
        : toBigInt(seasonNoRaw, BigInt(-1));

    const seasonId =
        chainSeasonNo !== null && chainSeasonNo >= 0n
            ? (
                await prisma.season.upsert({
                    where: { chainSeasonNo },
                    create: { chainSeasonNo },
                    update: {},
                    select: { id: true },
                })
            ).id
            : null;

    await prisma.round.upsert({
        where: { roundId: roundAddress },
        create: {
            roundId: roundAddress,
            chainRoundId: chainRoundId,
            seasonId,
            pairSymbol,
            coinSymbol,
            startTime,
            endTime,
            entryFee,
            status: "UPCOMING",
            ownerAddress: event.sender,
        },
        update: {
            chainRoundId: chainRoundId,
            seasonId,
            pairSymbol,
            coinSymbol,
            startTime,
            endTime,
            entryFee,
            status: "UPCOMING",
            ownerAddress: event.sender,
        },
    });
}

async function handleTournamentStarted(p: Record<string, unknown>) {
    const chainRoundId = toBigInt(p.round_id || p.roundId || p.chain_round_id);
    await prisma.round.updateMany({
        where: { chainRoundId },
        data: { status: "LIVE" },
    });
}

async function handleTournamentEnded(p: Record<string, unknown>) {
    const chainRoundId = toBigInt(p.round_id || p.roundId || p.chain_round_id);
    await prisma.round.updateMany({
        where: { chainRoundId },
        data: { status: "FINISHED" },
    });
}

async function handleTournamentSettled(p: Record<string, unknown>) {
    const chainRoundId = toBigInt(p.round_id || p.roundId || p.chain_round_id);
    await prisma.round.updateMany({
        where: { chainRoundId },
        data: { status: "FINISHED" },
    });
}

async function handleTournamentCancelled(p: Record<string, unknown>) {
    const chainRoundId = toBigInt(p.round_id || p.roundId || p.chain_round_id);
    await prisma.round.updateMany({
        where: { chainRoundId },
        data: { status: "CANCELED" },
    });
}

async function handlePredictionRecorded(
    p: Record<string, unknown>,
    event: SuiEvent,
) {
    const roundAddress = toStringValue(p.round_address || p.round_id);
    const player = toPlayer(p.player);
    if (!player) return;

    const direction = toNumber(p.direction);
    const stakeRaw = toBigInt(p.stake_amount);
    const time = toDate(p.prediction_time);
    const isEarly = p.is_early === true || p.is_early === "true";
    const txDigest = event.id.txDigest;

    await prisma.prediction.upsert({
        where: { roundId_player: { roundId: roundAddress, player } },
        create: { roundId: roundAddress, player, direction, stakeRaw, time, isEarly, txDigest },
        update: { direction, stakeRaw, time, isEarly },
    });

    // Recompute aggregates for this round from the Prediction table
    const [upAgg, downAgg] = await Promise.all([
        prisma.prediction.aggregate({
            where: { roundId: roundAddress, direction: 1 },
            _count: { id: true },
            _sum: { stakeRaw: true },
        }),
        prisma.prediction.aggregate({
            where: { roundId: roundAddress, direction: 2 },
            _count: { id: true },
            _sum: { stakeRaw: true },
        }),
    ]);

    const upCount = upAgg._count.id;
    const downCount = downAgg._count.id;
    const totalUpStake = upAgg._sum.stakeRaw ?? BigInt(0);
    const totalDownStake = downAgg._sum.stakeRaw ?? BigInt(0);

    await prisma.round.updateMany({
        where: { roundId: roundAddress },
        data: {
            upCount,
            downCount,
            totalParticipants: upCount + downCount,
            totalUpStake,
            totalDownStake,
        },
    });
}

async function handlePredictionResultSet(p: Record<string, unknown>) {
    const player = toPlayer(p.player);
    if (!player) return;

    await prisma.prediction.updateMany({
        where: { roundId: toStringValue(p.round_address || p.round_id), player },
        data: {
            isCorrect: p.is_correct === true || p.is_correct === "true",
            rank: toNumber(p.rank),
        },
    });
}

async function handleRewardClaimed(
    p: Record<string, unknown>,
    event: SuiEvent,
) {
    const player = toPlayer(p.player);
    if (!player) return;

    const timestamp = event.timestampMs
        ? new Date(Number(event.timestampMs))
        : new Date();

    await prisma.rewardClaim.upsert({
        where: { roundId_player: { roundId: toStringValue(p.round_address || p.round_id), player } },
        create: {
            roundId: toStringValue(p.round_address || p.round_id),
            player,
            principal: toBigInt(p.principal),
            reward: toBigInt(p.reward),
            txDigest: event.id.txDigest,
            timestamp,
        },
        update: {}, // claim is immutable — ignore re-delivery
    });
}

async function handleScoreUpdated(
    p: Record<string, unknown>,
    event: SuiEvent,
) {
    const seasonId = toBigInt(p.season_id);
    const player = toPlayer(p.player);
    if (!player) return;

    const points = toBigInt(p.points_earned);
    const newTotal = toBigInt(p.new_total_score);
    const streak = toBigInt(p.current_streak);
    const ts = event.timestampMs ? new Date(Number(event.timestampMs)) : new Date();

    await prisma.$transaction([
        prisma.scoreEvent.create({
            data: {
                seasonId,
                player,
                points,
                newTotal,
                streak,
                txDigest: event.id.txDigest,
                timestamp: ts,
            },
        }),
        prisma.score.upsert({
            where: { seasonId_player: { seasonId, player } },
            create: { seasonId, player, total: newTotal, streak, updatedAt: ts },
            update: { total: newTotal, streak, updatedAt: ts },
        }),
    ]);
}

async function handleSeasonEnded(
    p: Record<string, unknown>,
    event: SuiEvent,
) {
    const seasonId = toBigInt(p.season_id);
    const ts = event.timestampMs ? new Date(Number(event.timestampMs)) : new Date();

    await prisma.seasonSummary.upsert({
        where: { seasonId },
        create: {
            seasonId,
            totalPlayers: toBigInt(p.total_players),
            winner: toPlayer(p.winner) || (typeof p.winner === "string" ? p.winner : ""),
            winningScore: toBigInt(p.winning_score),
            txDigest: event.id.txDigest,
            timestamp: ts,
        },
        update: {}, // season summary is immutable
    });
}
