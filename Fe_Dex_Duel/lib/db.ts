import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function getPrismaLogLevels(): Array<"warn" | "error"> {
    if (process.env.PRISMA_DISABLE_ERROR_LOGS === "1") {
        return [];
    }
    return process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
}

// Prisma v7 requires a driver adapter - the native engine is no longer supported.
function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
        adapter,
        log: getPrismaLogLevels(),
    });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}