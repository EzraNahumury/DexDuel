-- Sequences for local UI ordering
CREATE SEQUENCE IF NOT EXISTS season_no_seq;
CREATE SEQUENCE IF NOT EXISTS round_no_seq;

-- RoundStatus enum handling (legacy-safe and ordering-safe)
DO $$
DECLARE
  has_legacy boolean;
  has_status_col boolean;
  has_unexpected boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundStatus') THEN
    CREATE TYPE "RoundStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED', 'CANCELED', 'SETTLED');
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Round' AND column_name = 'status'
  ) INTO has_status_col;

  IF NOT has_status_col THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RoundStatus'
      AND e.enumlabel IN ('PENDING', 'ACTIVE', 'ENDED')
  ) INTO has_legacy;

  IF has_legacy THEN
    CREATE TYPE "RoundStatus_new" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED', 'CANCELED', 'SETTLED');
    ALTER TABLE "Round" ALTER COLUMN "status" TYPE "RoundStatus_new" USING (
      CASE "status"
        WHEN 'PENDING' THEN 'UPCOMING'
        WHEN 'ACTIVE' THEN 'LIVE'
        WHEN 'ENDED' THEN 'FINISHED'
        WHEN 'SETTLED' THEN 'SETTLED'
        ELSE NULL
      END
    )::"RoundStatus_new";
    IF EXISTS (SELECT 1 FROM "Round" WHERE "status" IS NULL) THEN
      RAISE EXCEPTION 'Unexpected Round.status value detected during migration';
    END IF;
    -- NOTE: DROP TYPE "RoundStatus" will fail if other columns still reference it.
    DROP TYPE "RoundStatus";
    ALTER TYPE "RoundStatus_new" RENAME TO "RoundStatus";
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RoundStatus'
        AND e.enumlabel NOT IN ('UPCOMING', 'LIVE', 'FINISHED', 'CANCELED', 'SETTLED')
    ) INTO has_unexpected;
    IF has_unexpected THEN
      RAISE EXCEPTION 'RoundStatus enum contains unexpected labels; manual repair required';
    END IF;

    -- Append missing labels in a stable order
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RoundStatus' AND e.enumlabel = 'UPCOMING'
    ) THEN
      ALTER TYPE "RoundStatus" ADD VALUE 'UPCOMING';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RoundStatus' AND e.enumlabel = 'LIVE'
    ) THEN
      ALTER TYPE "RoundStatus" ADD VALUE 'LIVE';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RoundStatus' AND e.enumlabel = 'FINISHED'
    ) THEN
      ALTER TYPE "RoundStatus" ADD VALUE 'FINISHED';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RoundStatus' AND e.enumlabel = 'CANCELED'
    ) THEN
      ALTER TYPE "RoundStatus" ADD VALUE 'CANCELED';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RoundStatus' AND e.enumlabel = 'SETTLED'
    ) THEN
      ALTER TYPE "RoundStatus" ADD VALUE 'SETTLED';
    END IF;
  END IF;
END $$;

-- Season table: reconcile schema safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Season'
  ) THEN
    CREATE TABLE "Season" (
      "id" SERIAL NOT NULL,
      "seasonNo" INTEGER,
      "chainSeasonNo" BIGINT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

ALTER TABLE "Season" ADD COLUMN IF NOT EXISTS "seasonNo" INTEGER;
ALTER TABLE "Season" ADD COLUMN IF NOT EXISTS "chainSeasonNo" BIGINT;
ALTER TABLE "Season" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Season" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Season" ALTER COLUMN "seasonNo" SET DEFAULT nextval('season_no_seq');

WITH rows AS (
  SELECT "id" FROM "Season" WHERE "seasonNo" IS NULL ORDER BY "createdAt" ASC
)
UPDATE "Season" s
SET "seasonNo" = nextval('season_no_seq')
FROM rows
WHERE s."id" = rows."id";

CREATE UNIQUE INDEX IF NOT EXISTS "Season_seasonNo_key" ON "Season"("seasonNo");
CREATE UNIQUE INDEX IF NOT EXISTS "Season_chainSeasonNo_key" ON "Season"("chainSeasonNo");

-- Round columns for local IDs + chain mapping
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "chainRoundId" TEXT;
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "roundNo" INTEGER;
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "seasonId" INTEGER;
ALTER TABLE "Round" ADD COLUMN IF NOT EXISTS "pairSymbol" TEXT;

ALTER TABLE "Round" ALTER COLUMN "roundNo" SET DEFAULT nextval('round_no_seq');

-- Preflight checks before backfill
DO $$
DECLARE
  missing_round_id integer;
  dup_round_id integer;
  missing_coin_symbol integer;
  dup_on_chain_id integer;
  has_on_chain_col boolean;
  bad_round_id_format integer;
  bad_on_chain_format integer;
BEGIN
  SELECT COUNT(*) INTO missing_round_id FROM "Round" WHERE "roundId" IS NULL;
  IF missing_round_id > 0 THEN
    RAISE EXCEPTION 'Cannot backfill chainRoundId: % rows have NULL roundId', missing_round_id;
  END IF;

  SELECT COUNT(*) INTO dup_round_id FROM (
    SELECT "roundId" FROM "Round" GROUP BY "roundId" HAVING COUNT(*) > 1
  ) d;
  IF dup_round_id > 0 THEN
    RAISE EXCEPTION 'Cannot backfill chainRoundId: duplicate roundId values detected';
  END IF;

  SELECT COUNT(*) INTO missing_coin_symbol FROM "Round" WHERE "coinSymbol" IS NULL;
  IF missing_coin_symbol > 0 THEN
    RAISE EXCEPTION 'Cannot backfill pairSymbol: % rows have NULL coinSymbol', missing_coin_symbol;
  END IF;

  SELECT COUNT(*) INTO bad_round_id_format
  FROM "Round"
  WHERE length("roundId"::text) < 3;
  IF bad_round_id_format > 0 THEN
    RAISE EXCEPTION 'Cannot backfill chainRoundId: roundId length < 3 for % rows', bad_round_id_format;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Round' AND column_name = 'onChainRoundId'
  ) INTO has_on_chain_col;

  IF has_on_chain_col THEN
    SELECT COUNT(*) INTO dup_on_chain_id FROM (
      SELECT "onChainRoundId" FROM "Round"
      WHERE "onChainRoundId" IS NOT NULL
      GROUP BY "onChainRoundId" HAVING COUNT(*) > 1
    ) d;
    IF dup_on_chain_id > 0 THEN
      RAISE EXCEPTION 'Cannot backfill chainRoundId: duplicate onChainRoundId values detected';
    END IF;

    SELECT COUNT(*) INTO bad_on_chain_format
    FROM "Round"
    WHERE "onChainRoundId" IS NOT NULL AND length("onChainRoundId") < 3;
    IF bad_on_chain_format > 0 THEN
      RAISE EXCEPTION 'Cannot backfill chainRoundId: onChainRoundId length < 3 for % rows', bad_on_chain_format;
    END IF;
  END IF;
END $$;

-- Backfill new columns for existing rows (prefer onChainRoundId)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Round' AND column_name = 'onChainRoundId'
  ) THEN
    EXECUTE 'UPDATE "Round" SET "chainRoundId" = "onChainRoundId" WHERE "chainRoundId" IS NULL AND "onChainRoundId" IS NOT NULL';
  END IF;
END $$;

UPDATE "Round"
SET "chainRoundId" = "roundId"::text
WHERE "chainRoundId" IS NULL;

-- Sanity check on chainRoundId after backfill
DO $$
DECLARE
  bad_chain_format integer;
BEGIN
  SELECT COUNT(*) INTO bad_chain_format
  FROM "Round"
  WHERE "chainRoundId" IS NULL OR length("chainRoundId") < 3;
  IF bad_chain_format > 0 THEN
    RAISE EXCEPTION 'Invalid chainRoundId detected during backfill';
  END IF;
END $$;

UPDATE "Round" SET "pairSymbol" = "coinSymbol" WHERE "pairSymbol" IS NULL;
WITH rows AS (
  SELECT "id" FROM "Round" WHERE "roundNo" IS NULL ORDER BY "createdAt" ASC
)
UPDATE "Round" r
SET "roundNo" = nextval('round_no_seq')
FROM rows
WHERE r."id" = rows."id";

-- Enforce constraints after backfill
ALTER TABLE "Round" ALTER COLUMN "chainRoundId" SET NOT NULL;
ALTER TABLE "Round" ALTER COLUMN "pairSymbol" SET NOT NULL;
ALTER TABLE "Round" ALTER COLUMN "roundNo" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Round_chainRoundId_key" ON "Round"("chainRoundId");
CREATE UNIQUE INDEX IF NOT EXISTS "Round_roundNo_key" ON "Round"("roundNo");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Round_seasonId_fkey'
  ) THEN
    ALTER TABLE "Round"
      ADD CONSTRAINT "Round_seasonId_fkey"
      FOREIGN KEY ("seasonId")
      REFERENCES "Season"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
