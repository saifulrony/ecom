#!/bin/bash
if [ "$EUID" -ne 0 ]; then
    echo "❌ Need sudo: sudo ./fix-ecom-app-now.sh"
    exit 1
fi

echo "🔧 Adding trust authentication for ecom_app..."

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs | xargs)

if [ -z "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

# Remove old ecom_app rules
sed -i.bak '/^host.*all.*ecom_app/d' "$PG_HBA"

# Add at the very top
FIRST_RULE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)
if [ -n "$FIRST_RULE" ]; then
    sed -i "$((FIRST_RULE-1))a# Trust for ecom_app (DEVELOPMENT)" "$PG_HBA"
    sed -i "$FIRST_RULE a host    all             ecom_app        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+1)) a host    all             ecom_app        ::1/128                 trust" "$PG_HBA"
fi

echo "✅ Rule added, restarting PostgreSQL..."
systemctl stop postgresql
sleep 2
systemctl start postgresql
sleep 4

echo "✅ PostgreSQL restarted"
echo ""
echo "✅ Fixed! Trust authentication enabled for ecom_app"
echo ""
echo "🚀 Now run: ./dev.sh"
echo ""
echo "Your website will be at: http://localhost:10001"
