// Applies generated SQL migrations from ./drizzle to the PostgreSQL database.
// Plain JS + runtime deps only, so it runs in dev and in the production image.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env if present (no-op in containers where env is already set).
try {
  process.loadEnvFile?.();
} catch {
  /* .env is optional */
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsFolder = join(root, "drizzle");

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

await migrate(db, { migrationsFolder });
await pool.end();

console.log("[migrate] applied migrations");
