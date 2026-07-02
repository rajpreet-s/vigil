# syntax=docker/dockerfile:1

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy manifests first to leverage layer caching
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/

# Install all dependencies (including devDeps — we need tsx to run TS directly)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY packages/agent/ ./packages/agent/
COPY packages/shared/ ./packages/shared/

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy installed node_modules and generated Prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy source (tsx runs TS directly in production — no separate tsc build needed)
COPY --from=builder /app/packages/agent ./packages/agent
COPY --from=builder /app/packages/shared ./packages/shared

# Copy user topology files (mounted at runtime in dev, baked in for prod image)
COPY user-files/ ./user-files/

# Copy root package.json (needed for module resolution)
COPY package.json ./

# Non-root user for security
RUN addgroup -S vigil && adduser -S vigil -G vigil
USER vigil

EXPOSE 3001

# tsx runs the server entry point directly
CMD ["node_modules/.bin/tsx", "packages/agent/server.ts"]
