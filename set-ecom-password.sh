#!/bin/bash

# Properly set ecom_app password using peer auth

if [ "$EUID" -ne 0 ]; then
    echo "❌ Need sudo: sudo ./set-ecom-password.sh"
    exit 1
fi

echo "🔐 Setting ecom_app password properly..."

sudo -u postgres psql << 'PSQL'
-- Drop and recreate to ensure clean state
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecom_app') THEN
        CREATE USER ecom_app WITH PASSWORD 'ecom_password';
    ELSE
        ALTER USER ecom_app WITH PASSWORD 'ecom_password';
    END IF;
END
$$;

-- Grant permissions
ALTER USER ecom_app CREATEDB;
ALTER USER ecom_app WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE ecom_db TO ecom_app;

-- Verify
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'ecom_app';
PSQL

echo ""
echo "✅ Password set: ecom_password"
echo "✅ User: ecom_app"
echo ""
echo "🚀 Run: ./dev.sh"

