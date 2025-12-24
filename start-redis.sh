#!/bin/bash

# Start Redis if not already running

echo "Checking Redis status..."

if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is already running"
    exit 0
fi

echo "Redis is not running. Attempting to start..."

# Try to start Redis server directly
redis-server --daemonize yes 2>/dev/null

# Wait a moment
sleep 1

# Check if it started
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis started successfully"
    exit 0
else
    echo "⚠️  Redis failed to start automatically"
    echo "Please start Redis manually:"
    echo "  sudo systemctl start redis-server"
    echo "  OR"
    echo "  redis-server --daemonize yes"
    exit 1
fi

