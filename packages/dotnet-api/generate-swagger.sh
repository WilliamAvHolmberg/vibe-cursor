#!/bin/bash
set -e

echo "🔨 Generating Swagger JSON..."

# Kill any existing dotnet processes on port 5001
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Start the API in the background with swagger generation mode
cd "$(dirname "$0")"
SWAGGER_GENERATION_MODE=true dotnet run --no-build &
API_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    kill $API_PID 2>/dev/null || true
    lsof -ti:5001 | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

# Wait for API to be ready (max 30 seconds)
echo "⏳ Waiting for API to start..."
for i in {1..30}; do
    if curl -s http://localhost:5001/swagger/v1/swagger.json > /dev/null 2>&1; then
        echo "✅ API is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ API failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Fetch the swagger JSON
echo "📥 Fetching Swagger JSON..."
curl -s http://localhost:5001/swagger/v1/swagger.json -o ../../swagger.json

echo "✅ Swagger JSON generated at swagger.json"
