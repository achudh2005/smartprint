# ============================================================
# SmartPrint – Production Multi-Stage Dockerfile
# ============================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install system dependencies (build-base for argon2 compilation)
RUN apk add --no-cache python3 make g++

# Copy backend dependencies and install
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy database schema and generate Prisma client
COPY backend/prisma ./prisma
COPY database/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy backend source code
COPY backend/src ./src
COPY backend/tests ./tests

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy root metadata
WORKDIR /app
COPY package.json ./

# Create persistent storage directories
RUN mkdir -p /app/uploads /app/data

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "backend/src/index.js"]
