# ExcalidrawDash

A self-hostable **dashboard for [Excalidraw](https://excalidraw.com)**. Excalidraw
is a wonderful drawing tool, but on its own it has no place to keep all your
boards — you save `.excalidraw` files locally and lose track of them.

ExcalidrawDash wraps the Excalidraw editor in a proper app:

- 🗂️ **Folders & subfolders** — nest colored folders to any depth; **drag to reorder or re-nest**
- 🏷️ **Tags** — classify boards by type and filter by tag
- 🔍 **Search** — find boards by name instantly
- ⭐ **Favorites** + **smart views** (All / Favorites / Unfiled)
- 🔀 **Sort** by last modified, date created, or name
- 🔐 **Login** — email/password accounts, each user sees only their boards
- 💾 **Autosave** — every change is persisted; thumbnails generated automatically
- 🌍 **Multi-language** — English, French, Spanish, Arabic (with RTL); easy to add more
- 📦 **Self-host first** — one `docker compose up` and you're running

Boards open in the real Excalidraw editor (the official `@excalidraw/excalidraw`
package), served fully offline — no CDN dependency.

---

## Quick start (Docker)

The fastest way to run everything (app + PostgreSQL):

```bash
git clone <this-repo> excalidrawdash && cd excalidrawdash

# Set a real secret (used to sign session cookies) and a database password.
# Both are required — the stack refuses to boot on placeholder/empty values.
export AUTH_SECRET="$(openssl rand -base64 32)"
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"

# Optional: create a demo account (demo@excalidash.local) on first boot. A random
# password is generated and printed to the container logs (`docker compose logs app`),
# or set SEED_PASSWORD to choose your own.
export SEED_ON_START=true

docker compose up -d --build
```

> The bundled Postgres is bound to `127.0.0.1` and is not published to the
> network. The app reaches it over the internal compose network, so you don't
> need to expose a host port in production.

Open <http://localhost:3000>, register an account (or use the demo login), and
start drawing. Data lives in the `pgdata` Docker volume.

### Useful environment variables

| Variable               | Default              | Purpose                                              |
| ---------------------- | -------------------- | ---------------------------------------------------- |
| `AUTH_SECRET`          | _(required)_         | Secret for signing session JWTs. **Change it.**      |
| `DATABASE_URL`         | set by compose       | PostgreSQL connection string.                        |
| `DISABLE_REGISTRATION` | `false`              | Set `true` to lock down public sign-ups.             |
| `SEED_ON_START`        | `false`              | Create a starter account/folders on first boot.      |
| `SEED_PASSWORD`        | _(random)_           | Demo account password when seeding; generated + printed if unset. |
| `POSTGRES_PASSWORD`    | _(required)_         | Password for the bundled Postgres. **Set it.**       |

---

## Local development

You need Node 20+ and [pnpm](https://pnpm.io). Postgres can come from Docker.

```bash
pnpm install

# 1. Start just the database
docker compose up -d db

# 2. Configure env
cp .env.example .env          # then edit AUTH_SECRET

# 3. Apply the schema + (optionally) seed a demo user
pnpm db:migrate
pnpm seed                     # demo@excalidash.local (password printed to stdout)

# 4. Run the dev server
pnpm dev
```

App runs at <http://localhost:3000>.

### Scripts

| Script             | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `pnpm dev`         | Next dev server (copies Excalidraw assets first).         |
| `pnpm build`       | Production build.                                         |
| `pnpm start`       | Start the production build.                               |
| `pnpm db:generate` | Generate a new SQL migration from `src/db/schema.ts`.     |
| `pnpm db:migrate`  | Apply pending migrations.                                 |
| `pnpm db:push`     | Push schema directly (handy in early dev).                |
| `pnpm db:studio`   | Open Drizzle Studio.                                      |
| `pnpm seed`        | Insert the demo account (prints a generated password).    |

---

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Drizzle ORM** on **PostgreSQL** (`pg`)
- **Tailwind CSS** for the UI
- **jose** (JWT in an httpOnly cookie) + **bcryptjs** for auth
- **@excalidraw/excalidraw** for the editor

## Project structure

```
src/
  app/
    api/                # JSON API (auth, folders, boards)
    dashboard/          # dashboard shell + board grid
    board/[id]/         # full-screen Excalidraw editor
    login, register/    # auth pages
  components/
    auth/               # AuthForm (login + register)
    dashboard/          # provider, sidebar, topbar, toolbar, board cards
    editor/             # ExcalidrawEditor (autosave + thumbnails)
    landing/            # marketing landing page
    ui/                 # menu, modal, icons + shared primitives
  db/                   # Drizzle schema + pg client
  lib/                  # auth, session, validation, fetcher + API helpers
drizzle/                # generated SQL migrations
scripts/                # migrate / seed / copy-excalidraw-assets
```

## How data is stored

Each board stores the Excalidraw scene (`elements`, `appState`, `files`) as JSON
plus a small auto-generated JPEG thumbnail. Folders and tags provide organization;
all queries are scoped to the logged-in user.

## Security notes

- Always set a strong `AUTH_SECRET` and `POSTGRES_PASSWORD` in production — the
  Docker stack refuses to boot on missing or placeholder values, and the app
  refuses to sign or verify sessions with them.
- Run behind HTTPS (the session cookie is marked `secure` in production).
- Set `DISABLE_REGISTRATION=true` if you don't want open sign-ups.
- The bundled Postgres binds to `127.0.0.1` only; don't publish port 5432 to the
  network. If you must, firewall it and use a strong password.
- Auth endpoints are rate-limited per IP (and per account for login). The limiter
  is in-process, so if you run multiple app replicas, enforce limits at your proxy.
- Sessions are signed JWTs in an httpOnly cookie. **Logging out signs out every
  session for that account** (it bumps a server-side session version), so a token
  captured before logout stops working.
- Baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are sent on every response.

## License

MIT
