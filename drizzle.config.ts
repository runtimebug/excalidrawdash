import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  "postgresql://excalidash:excalidash@localhost:5432/excalidash";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
