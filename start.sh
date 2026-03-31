#!/bin/bash
# Soul Society Registry - Quick Start Script

echo "⚔️  Opening the Senkaimon (Starting Frontend)..."

cd "$(dirname "$0")/frontend"

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
fi

# Install dependencies if node_modules missing
if [ ! -d node_modules ]; then
    echo "📦 Gathering spiritual energy (Installing dependencies)..."
    npm install --legacy-peer-deps
fi

# Run dev server
echo "🚀 Releasing Bankai (npm run dev)..."
npm run dev
