#!/bin/bash

# Zemo Development Setup Script
# This script sets up the development environment for Zemo modular architecture

set -e

echo "🚀 Setting up Zemo Development Environment"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "20" ]; then
    echo "❌ Node.js version 20 or higher is required. Current version: $(node -v). Aborting." >&2
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "📦 Building shared package..."
cd packages/shared
npm install
npm run build
cd ../..

echo "📦 Building API service..."
cd apps/api
npm install
cd ../..

echo "📦 Building Worker service..."
cd apps/worker
npm install
cd ../..

echo "✅ Dependencies installed"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd packages/shared
npx prisma generate
cd ../..

# Setup environment files
echo "📝 Setting up environment files..."

if [ ! -f "infra/compose/.env.api" ]; then
    cp infra/compose/.env.api.example infra/compose/.env.api
    echo "⚠️  Please configure infra/compose/.env.api with your settings"
fi

if [ ! -f "infra/compose/.env.worker" ]; then
    cp infra/compose/.env.worker.example infra/compose/.env.worker
    echo "⚠️  Please configure infra/compose/.env.worker with your settings"
fi

# Create initial database migration
echo "🗄️  Creating initial database migration..."
cd packages/shared
npx prisma migrate dev --name init --skip-seed || true
cd ../..

echo "✅ Environment setup complete"

# Development helper functions
echo "📚 Development commands:"
echo "  npm run dev:api      - Start API service in development mode"
echo "  npm run dev:worker    - Start Worker service in development mode"
echo "  npm run build         - Build all packages"
echo "  npm run test          - Run all tests"
echo "  npm run docker:up      - Start infrastructure services"
echo "  npm run docker:down    - Stop infrastructure services"
echo "  npm run docker:logs    - View infrastructure logs"
echo "  npm run migrate        - Apply database migrations"
echo ""

echo "🎯 Quick start:"
echo "  1. Configure your API keys in infra/compose/.env.api and infra/compose/.env.worker"
echo "  2. Run 'npm run docker:up' to start infrastructure"
echo "  3. Run 'npm run dev:api' to start API service"
echo "  4. Run 'npm run dev:worker' to start Worker service"
echo "  5. Visit http://localhost:3000/docs for API documentation"
echo ""

echo "🎉 Zemo development environment is ready!"