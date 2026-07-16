# syntax=docker/dockerfile:1

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy manifests first to leverage layer caching
COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/package-lock.json ./packages/api/
COPY prisma/ ./prisma/

# Install root dependencies (including Prisma CLI required for generation)
RUN npm ci

# Install API-specific dependencies (including TypeScript required for building)
WORKDIR /app/packages/api
RUN npm ci

# Back to root to generate Prisma client (creates files inside node_modules/.prisma)
WORKDIR /app
RUN npx prisma generate

# Copy TS configs and source files
COPY tsconfig.json ./
COPY packages/api/ ./packages/api/
COPY packages/shared/ ./packages/shared/

# Build the API server (compiles TS files to dist)
WORKDIR /app/packages/api
RUN npm run build

# Prune devDependencies in both root and API packages to reduce image size
WORKDIR /app
RUN npm prune --omit=dev

WORKDIR /app/packages/api
RUN npm prune --omit=dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Create non-root user and group for security
RUN addgroup -S vigil && adduser -S vigil -G vigil

# Copy pruned root and api node_modules (includes generated Prisma client)
COPY --from=builder --chown=vigil:vigil /app/node_modules ./node_modules
COPY --from=builder --chown=vigil:vigil /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder --chown=vigil:vigil /app/prisma ./prisma

# Copy only the compiled API JavaScript files
COPY --from=builder --chown=vigil:vigil /app/packages/api/dist ./packages/api/dist

# Copy manifest files
COPY --chown=vigil:vigil package.json ./
COPY --chown=vigil:vigil packages/api/package.json ./packages/api/

# Switch execution context to the secure non-root user
USER vigil

EXPOSE 8080

# Run native Node.js against the compiled JavaScript entry point
CMD ["node", "packages/api/dist/server.js"]
