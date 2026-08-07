// ============================================================================
// Prisma Client singleton.
//
// Prisma 7 removed the implicit "read URL from schema.prisma" behaviour.
// PrismaClient now REQUIRES an explicit driver adapter, and `new
// PrismaClient()` with no arguments throws. @prisma/adapter-pg is
// constructed directly from the connection string; it manages its own
// connection pool internally, so there's no need to construct a separate
// `pg.Pool` by hand (current adapter-pg API takes { connectionString },
// not a pre-built Pool instance).
//
// This file is independent of prisma.config.ts, which is read only by the
// Prisma CLI (migrate/studio/seed). The running app always wires its own
// connection here, reading the same DATABASE_URL from .env.
// ============================================================================

import "dotenv/config";
import { PrismaClient } from "@prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not defined. Ensure server/.env exists and contains a valid PostgreSQL connection string."
  );
}

const isProduction = process.env.NODE_ENV === "production";

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: isProduction ? 30_000 : 15_000,
});

// Reuse the client across hot-reloads in development so `tsx watch` doesn't
// exhaust Postgres connections by creating a new pool on every reload.
const prisma =
  globalThis.__prisma__ ??
  new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["query", "warn", "error"],
  });

if (!isProduction) {
  globalThis.__prisma__ = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
