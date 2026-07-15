// Poisons the client bundle: any client component that reaches this module,
// however indirectly, now fails the build with an error naming the file rather
// than a runtime "can't resolve 'dns'" that names neither. Keep pure helpers
// (format, parts, landed-cost) in modules that don't import prisma.
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7's generated client is engine-free and requires a driver adapter.
// @prisma/adapter-pg (node-postgres) works with any Postgres — Neon, Supabase,
// or a local instance — driven by the DATABASE_URL connection string.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse a single PrismaClient across hot-reloads in dev so we don't exhaust the
// database connection pool. See https://pris.ly/d/help/nextjs-best-practices
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
