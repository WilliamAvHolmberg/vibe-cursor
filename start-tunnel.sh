#!/bin/bash

echo "Starting Vite dev server..."
npm run dev > /tmp/vite-output.log 2>&1 &
VITE_PID=$!

sleep 3

echo "Starting Cloudflare tunnel..."
./cloudflared tunnel --url http://localhost:5173 2>&1 | tee /tmp/cloudflared.log &
TUNNEL_PID=$!

sleep 5

TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo "$TUNNEL_URL" > /tmp/tunnel-url.txt
    echo ""
    echo "================================"
    echo "🚢 Cruise Ship Ocean Scene Ready!"
    echo "================================"
    echo ""
    echo "Local URL:  http://localhost:5173"
    echo "Tunnel URL: $TUNNEL_URL"
    echo ""
    echo "================================"
    echo ""
else
    echo "http://localhost:5173" > /tmp/tunnel-url.txt
    echo "Tunnel URL not detected, using localhost"
fi

wait $VITE_PID $TUNNEL_PID
