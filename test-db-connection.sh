#!/bin/bash

# Test database connection with credentials from .env

cd backend
source <(grep -E "^DB_" .env | sed 's/^/export /')

echo "Testing connection with:"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo ""

PGPASSWORD=$DB_PASSWORD psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -c "SELECT 'Connection successful!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database connection works!"
    echo "The backend should be able to connect automatically."
else
    echo ""
    echo "❌ Connection failed - this is why the backend can't start."
    echo ""
    echo "Run: sudo ./add-ecom-app-trust.sh"
    echo "This will enable trust authentication so no password is needed."
fi

