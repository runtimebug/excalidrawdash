// Optional seed: creates a demo account so a fresh self-host instance is usable
// immediately. Safe to run repeatedly (no-op if the user already exists).
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";

try {
  process.loadEnvFile?.();
} catch {
  /* .env is optional */
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[seed] DATABASE_URL is not set");
  process.exit(1);
}

const DEMO_EMAIL = process.env.SEED_EMAIL || "demo@excalidash.local";
// Use an operator-supplied password if given; otherwise mint a strong random one
// so we never create an account with a known, guessable default credential. A
// generated password is printed once below — there is no way to recover it later.
const providedPassword = process.env.SEED_PASSWORD;
const DEMO_PASSWORD = providedPassword || randomBytes(12).toString("base64url");

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const existing = await client.query("SELECT id FROM users WHERE email = $1", [
    DEMO_EMAIL,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    console.log(`[seed] user ${DEMO_EMAIL} already exists, skipping.`);
  } else {
    const userId = randomUUID();
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

    await client.query(
      `INSERT INTO users (id, email, name, password) VALUES ($1, $2, $3, $4)`,
      [userId, DEMO_EMAIL, "Demo User", hash]
    );

    const ideasId = randomUUID();
    await client.query(
      `INSERT INTO folders (id, name, color, position, user_id) VALUES ($1, $2, $3, $4, $5)`,
      [ideasId, "Ideas", "#6965db", 0, userId]
    );
    await client.query(
      `INSERT INTO folders (id, name, color, position, user_id) VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), "Diagrams", "#0c8599", 1, userId]
    );

    await client.query(
      `INSERT INTO boards (id, title, tags, folder_id, user_id) VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), "Welcome to ExcalidrawDash", "getting-started", ideasId, userId]
    );

    if (providedPassword) {
      console.log(
        `[seed] created demo user -> email: ${DEMO_EMAIL}  password: (your SEED_PASSWORD)`
      );
    } else {
      console.log(
        `[seed] created demo user -> email: ${DEMO_EMAIL}\n` +
          `[seed] generated password: ${DEMO_PASSWORD}\n` +
          `[seed] ^ shown once — save it now. Set SEED_PASSWORD to choose your own.`
      );
    }
  }
} finally {
  await client.end();
}
