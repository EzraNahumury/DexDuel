-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'SETTLED');

-- CreateTable
CREATE TABLE "ChainCursor" (
    "eventType" TEXT NOT NULL,
    "cursor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainCursor_pkey" PRIMARY KEY ("eventType")
);

-- CreateTable
CREATE TABLE "ChainEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "txDigest" TEXT NOT NULL,
    "eventSeq" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "roundId" BIGINT NOT NULL,
    "coinSymbol" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "entryFee" BIGINT NOT NULL,
    "priceStart" BIGINT,
    "priceEnd" BIGINT,
    "winnerDir" INTEGER,
    "totalYield" BIGINT,
    "adminFee" BIGINT,
    "prizePool" BIGINT,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "upCount" INTEGER NOT NULL DEFAULT 0,
    "downCount" INTEGER NOT NULL DEFAULT 0,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "totalUpStake" BIGINT NOT NULL DEFAULT 0,
    "totalDownStake" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "roundId" BIGINT NOT NULL,
    "player" TEXT NOT NULL,
    "direction" INTEGER NOT NULL,
    "stakeRaw" BIGINT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "isEarly" BOOLEAN NOT NULL,
    "isCorrect" BOOLEAN,
    "rank" INTEGER,
    "txDigest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "roundId" BIGINT NOT NULL,
    "player" TEXT NOT NULL,
    "principal" BIGINT NOT NULL,
    "reward" BIGINT NOT NULL,
    "txDigest" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "seasonId" BIGINT NOT NULL,
    "player" TEXT NOT NULL,
    "total" BIGINT NOT NULL,
    "streak" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "seasonId" BIGINT NOT NULL,
    "player" TEXT NOT NULL,
    "points" BIGINT NOT NULL,
    "newTotal" BIGINT NOT NULL,
    "streak" BIGINT NOT NULL,
    "txDigest" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonSummary" (
    "id" TEXT NOT NULL,
    "seasonId" BIGINT NOT NULL,
    "totalPlayers" BIGINT NOT NULL,
    "winner" TEXT NOT NULL,
    "winningScore" BIGINT NOT NULL,
    "txDigest" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChainEvent_eventType_timestamp_idx" ON "ChainEvent"("eventType", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ChainEvent_eventType_txDigest_eventSeq_key" ON "ChainEvent"("eventType", "txDigest", "eventSeq");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roundId_key" ON "Round"("roundId");

-- CreateIndex
CREATE INDEX "Prediction_roundId_time_idx" ON "Prediction"("roundId", "time");

-- CreateIndex
CREATE INDEX "Prediction_player_time_idx" ON "Prediction"("player", "time");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_roundId_player_key" ON "Prediction"("roundId", "player");

-- CreateIndex
CREATE INDEX "RewardClaim_player_timestamp_idx" ON "RewardClaim"("player", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_roundId_player_key" ON "RewardClaim"("roundId", "player");

-- CreateIndex
CREATE INDEX "Score_seasonId_total_idx" ON "Score"("seasonId", "total");

-- CreateIndex
CREATE UNIQUE INDEX "Score_seasonId_player_key" ON "Score"("seasonId", "player");

-- CreateIndex
CREATE INDEX "ScoreEvent_seasonId_timestamp_idx" ON "ScoreEvent"("seasonId", "timestamp");

-- CreateIndex
CREATE INDEX "ScoreEvent_player_timestamp_idx" ON "ScoreEvent"("player", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonSummary_seasonId_key" ON "SeasonSummary"("seasonId");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("roundId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("roundId") ON DELETE RESTRICT ON UPDATE CASCADE;
