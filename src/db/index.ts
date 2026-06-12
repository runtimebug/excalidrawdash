import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Point it at your PostgreSQL instance, e.g. postgresql://user:pass@localhost:5432/excalidash"
  );
}

// Cache the pool on the global object so Next.js hot-reload doesn't open a new
// connection pool on every change in development.
const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __db?: ReturnType<typeof drizzle<typeof schema>>;
};

const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

export const db = globalForDb.__db ?? drizzle(pool, { schema, logger: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
  globalForDb.__db = db;
}
