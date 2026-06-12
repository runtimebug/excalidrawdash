# Contributing to ExcalidrawDash

Thanks for your interest in improving ExcalidrawDash! This guide covers the
basics for getting a local environment running and the conventions we follow.

## Prerequisites

- **Node 20+** (an `.nvmrc` is provided — run `nvm use`)
- **pnpm 9** (`corepack enable` will provide it)
- **Docker** (for a local PostgreSQL; you can also point at your own Postgres)

## Local setup

```bash
pnpm install

# Start just the database
docker compose up -d db

# Configure env (then edit AUTH_SECRET)
cp .env.example .env

# Apply the schema and (optionally) seed a demo user
pnpm db:migrate
pnpm seed            # demo@excalidash.local (password printed to stdout)

# Run the dev server
pnpm dev
```

The app runs at <http://localhost:3000>. See [README.md](README.md) for the full
list of scripts and environment variables.

## Before you open a PR

Please make sure the following pass locally — CI runs the same checks:

```bash
pnpm exec tsc --noEmit   # type check
pnpm lint                # ESLint (next/core-web-vitals)
pnpm build               # production build
```

If you change the database schema (`src/db/schema.ts`), generate a migration and
commit it alongside your change:

```bash
pnpm db:generate
```

## Conventions

- **TypeScript everywhere**, `strict` mode. Prefer explicit, narrow types over `any`.
- **Server-only code** (`src/lib/auth.ts`, `src/db`, route handlers, …) imports
  `"server-only"`; never import it into client components.
- **Validate all input** at the API boundary with the Zod schemas in
  `src/lib/validation.ts`, and scope every query to the authenticated user.
- **User-facing strings** go through the i18n dictionaries
  (`src/i18n/dictionaries.ts`) — English is the source of truth; other locales
  fall back to it. Add new keys to every locale when you can.
- Keep changes focused and match the style of the surrounding code.

## Project layout

A short map of the source tree lives in the **Project structure** section of the
[README](README.md#project-structure).

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
