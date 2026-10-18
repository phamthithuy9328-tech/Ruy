import { PrismaClient } from "@prisma/client";

/**
 * On serverless hosting every function instance opens its own pool, so a busy page can exhaust
 * Postgres connections ("Too many database connections"). For Postgres we therefore:
 * - go through Neon's connection pooler (the `-pooler` host) even if DATABASE_URL is the direct one,
 * - tell Prisma it is behind PgBouncer (no prepared statements),
 * - keep each instance's pool small.
 * Every setting can still be overridden in DATABASE_URL itself.
 */
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !/^postgres(ql)?:\/\//.test(raw)) return undefined;
  const url = new URL(raw);
  const [endpoint, ...rest] = url.hostname.split(".");
  if (url.hostname.endsWith(".neon.tech") && !endpoint.endsWith("-pooler")) url.hostname = [`${endpoint}-pooler`, ...rest].join(".");
  if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "3");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
  return url.toString();
}

const g = globalThis as unknown as { prisma?: PrismaClient };
const url = datasourceUrl();
export const db = g.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined);
g.prisma = db;
