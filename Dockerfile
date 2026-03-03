# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source files (separate from deps to leverage caching)
COPY tsconfig.json ./
COPY src ./src
COPY frontend/vite.config.ts frontend/index.html ./frontend/
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public

# Build backend and frontend
RUN npm run build

# Production stage - minimal image
FROM node:20-alpine
WORKDIR /app

# Only copy what's needed for production
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
