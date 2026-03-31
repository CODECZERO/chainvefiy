#!/bin/bash

echo "🔄 Restarting Frontend Server..."
echo ""

# Kill existing Next.js process
echo "1️⃣ Stopping existing server..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Clear Next.js cache
echo "2️⃣ Clearing Next.js cache..."
rm -rf .next
echo "   ✅ Cache cleared"

# Check environment variable
echo ""
echo "3️⃣ Checking environment variables..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local exists"
    cat .env.local
else
    echo "   ⚠️  .env.local not found, creating..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
    echo "   ✅ Created .env.local"
fi

echo ""
echo "4️⃣ Starting frontend server..."
echo "   Run: npm run dev"
echo ""
echo "📝 After starting, visit: http://localhost:3000"
echo "🧪 Test API connection: http://localhost:3000/api-test"
