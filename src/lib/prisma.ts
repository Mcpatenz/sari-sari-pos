import { PrismaClient } from "@prisma/client";

// Some Vercel environments expose the Neon pooled URL under POSTGRES_PRISMA_URL
// while Prisma's schema expects DATABASE_URL. Normalize it before client startup.
if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

// Neon suspends idle computes; the first query after a pause can take longer
// than Prisma's default 5s connect timeout. Use a bounded timeout so a cold
// start can still succeed without turning an outage into a long hang.
function resolveDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);

    // Neon's pooled (-pooler) endpoint sits behind PgBouncer in transaction
    // mode. Prisma must disable prepared statements there, and keeping one
    // connection per client stops concurrent cold-start queries from
    // exhausting the shared pool.
    if (url.hostname.includes("-pooler.")) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
    }

    // Suspended computes can take longer than 8s to wake. Allow enough time
    // for the first connection to establish, and for queued queries to wait.
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const TRANSIENT_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operation timed out
  "P1017", // Server closed the connection
  "P2024", // Timed out fetching a connection from the pool
]);

function isTransient(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && TRANSIENT_CODES.has(code);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  // A sleeping Neon compute can miss the first two attempts while it wakes.
  const maxAttempts = 3;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !isTransient(error)) throw error;
      await delay(250 * 2 ** (attempt - 1));
    }
  }
}

function createPrismaClient() {
  const base = new PrismaClient({ datasourceUrl: resolveDatasourceUrl() });

  return base.$extends({
    query: {
      $allOperations({ args, query }) {
        return withRetry(() => query(args));
      },
    },
  });
}

type PrismaClientWithRetry = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientWithRetry;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
