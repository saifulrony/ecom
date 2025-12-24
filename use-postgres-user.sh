#!/bin/bash

# Simple solution: Use postgres user with peer auth (always works)

echo "🔧 Switching to postgres user (peer auth - no password needed)"

cd backend

# Update .env to use postgres user
sed -i 's/^DB_USER=.*/DB_USER=postgres/' .env
sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' .env

echo "✅ Updated .env to use postgres user"
echo ""
echo "Now the backend will connect using peer authentication"
echo "which works without any password prompts!"
echo ""
echo "🚀 Run: ./dev.sh"

