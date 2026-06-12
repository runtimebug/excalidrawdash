# syntax=docker/dockerfile:1

# ---- base: node + pnpm via corepack ----
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---- deps: full install for building ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile Next app (prebuild copies Excalidraw assets into /public) ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder so nothing trips on a missing var during build (no DB calls happen).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-secret-value-000000"
RUN pnpm build

# ---- prod deps: runtime-only node_modules ----
FROM base AS proddeps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---- runner ----
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Run as the non-root node user.
COPY --from=proddeps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node package.json next.config.mjs ./
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["./docker-entrypoint.sh"]
