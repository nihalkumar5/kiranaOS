# Multi-stage production build for KiranaOS NestJS backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies for build
RUN npm ci

# Copy project files
COPY . .

# Generate Prisma Client for PostgreSQL PG adapter runtime
RUN npx prisma generate

# Build NestJS code
RUN npm run build

# Stage 2: Run build in clean slim container
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built code and generated prisma libraries
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

ENV NODE_ENV=production
EXPOSE 3000

# Run migrations and start NestJS app
CMD ["sh", "-c", "npx prisma db push && node dist/src/main.js"]
