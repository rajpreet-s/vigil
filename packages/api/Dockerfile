# syntax=docker/dockerfile:1

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy manifests first to leverage layer caching
COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/package-lock.json ./packages/api/
COPY prisma/ ./prisma/

# Install root deps first (Prisma CLI lives here)
RUN npm ci

# Install API-specific deps
WORKDIR /app/packages/api
RUN npm ci

# Back to root to generate Prisma client
WORKDIR /app
RUN npx prisma generate

# Copy API source and compile to JS
COPY packages/api/ ./packages/api/
COPY packages/shared/ ./packages/shared/

WORKDIR /app/packages/api
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy compiled output
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Copy API node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules

# Copy root node_modules (Prisma client lives here)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

COPY package.json ./
COPY packages/api/package.json ./packages/api/

# Non-root user for security
RUN addgroup -S vigil && adduser -S vigil -G vigil
USER vigil

EXPOSE 8080

CMD ["node", "packages/api/dist/server.js"]
