# syntax=docker/dockerfile:1

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root manifests and Prisma schema first to leverage layer caching
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/

# Install ALL dependencies (including devDependencies required for tsc compilation)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy tsconfig and source directories
COPY tsconfig.json ./
COPY packages/ ./packages/

# Compile TypeScript to JavaScript (uses the newly added 'build' script)
RUN npm run build

# Prune devDependencies out of node_modules, leaving only production dependencies
RUN npm prune --omit=dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Create non-root user and group for security
RUN addgroup -S vigil && adduser -S vigil -G vigil

# Copy pruned production node_modules (includes generated Prisma client)
COPY --from=builder --chown=vigil:vigil /app/node_modules ./node_modules
COPY --from=builder --chown=vigil:vigil /app/prisma ./prisma

# Copy the compiled JS output directory
COPY --from=builder --chown=vigil:vigil /app/dist ./dist

# Copy configuration and metadata files
COPY --chown=vigil:vigil user-files/ ./user-files/
COPY --chown=vigil:vigil package.json ./

# Switch execution context to the secure non-root user
USER vigil

EXPOSE 3001

# Run native Node.js against the compiled JavaScript entry point
CMD ["node", "dist/packages/agent/server.js"]
