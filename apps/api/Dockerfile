FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../packages/shared ./packages/shared
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Copy and build API service
WORKDIR /app
COPY . .

# Install API dependencies
RUN npm ci

# Build API
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built API
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S zemo -u 1001

# Change ownership of the app directory
RUN chown -R zemo:nodejs /app
USER zemo

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main"]