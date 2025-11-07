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

# Copy and build worker service
WORKDIR /app
COPY . .

# Install worker dependencies
RUN npm ci

# Build worker
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium since we installed it manually
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built worker
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S zemo -u 1001

# Change ownership of app directory
RUN chown -R zemo:nodejs /app
USER zemo

ENV NODE_ENV=production

CMD ["node", "dist/bootstrap"]