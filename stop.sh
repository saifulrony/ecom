#!/bin/bash

# Script to stop all development servers

echo "🛑 Stopping development servers..."

# Kill Go processes (backend)
pkill -f "go run main.go" 2>/dev/null
pkill -f "ecom-backend" 2>/dev/null

# Kill Node processes (frontend)
pkill -f "next dev" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

# Kill processes on specific ports
lsof -ti:10000 | xargs kill -9 2>/dev/null
lsof -ti:10001 | xargs kill -9 2>/dev/null

echo "✅ All servers stopped"

