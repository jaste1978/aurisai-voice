# ─────────────────────────────────────────────
# Stage 1: Build React frontend
# ─────────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build
# Output: /app/client/dist


# ─────────────────────────────────────────────
# Stage 2: Build NestJS backend
# ─────────────────────────────────────────────
FROM node:20-slim AS backend-build

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build
# Output: /app/backend/dist


# ─────────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────────
FROM node:20-slim AS production

# Install OpenSSL — required by Prisma on Debian/slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend dist + node_modules + prisma
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./package.json
COPY --from=backend-build /app/backend/prisma ./prisma

# Copy React build → NestJS will serve this as static files
COPY --from=frontend-build /app/client/dist ./public

EXPOSE 3000

# Push Prisma schema then start the app
CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma --skip-generate 2>&1 | tail -5 && node dist/main"]
