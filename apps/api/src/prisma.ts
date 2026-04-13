import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

export function isDatabaseConfigured(): boolean {
  return Boolean(databaseUrl && !databaseUrl.includes("<database-password>"));
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

export async function getDatabaseStatus() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      reachable: false
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      configured: true,
      reachable: true
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }
}
