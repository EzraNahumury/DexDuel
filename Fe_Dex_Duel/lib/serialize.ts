import type { Round } from "@prisma/client";

type RoundLike = Round & {
  isHidden?: boolean;
  hiddenAt?: Date | null;
  hiddenReason?: string | null;
};

export type SerializedRound = {
  id: string;
  roundNo: number | null;
  chainRoundId: string;
  roundId: string;
  seasonId: number | null;
  coinSymbol: string;
  pairSymbol: string;
  startTime: string;
  endTime: string;
  entryFee: string;
  status: Round["status"];
  priceStart: string | null;
  priceEnd: string | null;
  winnerDir: number | null;
  totalYield: string | null;
  adminFee: string | null;
  prizePool: string | null;
  upCount: number;
  downCount: number;
  totalParticipants: number;
  totalUpStake: string;
  totalDownStake: string;
  isHidden: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeRound(round: RoundLike): SerializedRound {
  return {
    id: round.id,
    roundNo: typeof (round as Round).roundNo === "number" ? (round as Round).roundNo : null,
    chainRoundId: (round as Round).chainRoundId ?? round.roundId.toString(),
    roundId: round.roundId.toString(),
    seasonId: typeof (round as Round).seasonId === "number" ? (round as Round).seasonId : null,
    coinSymbol: round.coinSymbol,
    pairSymbol: (round as Round).pairSymbol ?? round.coinSymbol,
    startTime: round.startTime.toISOString(),
    endTime: round.endTime.toISOString(),
    entryFee: round.entryFee.toString(),
    status: round.status,
    priceStart: round.priceStart?.toString() ?? null,
    priceEnd: round.priceEnd?.toString() ?? null,
    winnerDir: round.winnerDir ?? null,
    totalYield: round.totalYield?.toString() ?? null,
    adminFee: round.adminFee?.toString() ?? null,
    prizePool: round.prizePool?.toString() ?? null,
    upCount: round.upCount,
    downCount: round.downCount,
    totalParticipants: round.totalParticipants,
    totalUpStake: round.totalUpStake.toString(),
    totalDownStake: round.totalDownStake.toString(),
    isHidden: round.isHidden ?? false,
    hiddenAt: round.hiddenAt?.toISOString() ?? null,
    hiddenReason: round.hiddenReason ?? null,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
  };
}
