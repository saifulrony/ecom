#!/bin/bash

# Force trust authentication - remove ALL conflicting rules

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Need sudo${NC}"
    exit 1
fi

echo -e "${GREEN}🔧 Force Enabling Trust Authentication${NC}\n"

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs | xargs)

if [ -z "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

# Backup
cp "$PG_HBA" "${PG_HBA}.backup.force.$(date +%Y%m%d_%H%M%S)"

# Remove ALL host rules for 127.0.0.1 that require passwords
echo -e "${YELLOW}Removing conflicting rules...${NC}"
sed -i.bak '/^host.*all.*127\.0\.0\.1.*scram-sha-256/d' "$PG_HBA"
sed -i.bak '/^host.*all.*127\.0\.0\.1.*md5/d' "$PG_HBA"
sed -i.bak '/^host.*all.*ecom_app/d' "$PG_HBA"
sed -i.bak '/^host.*all.*postgres/d' "$PG_HBA"

# Find first rule
FIRST_RULE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)

if [ -n "$FIRST_RULE" ]; then
    # Add trust rules at the absolute top
    sed -i "$((FIRST_RULE-1))a# ========================================" "$PG_HBA"
    sed -i "$FIRST_RULE a# Trust for localhost (DEVELOPMENT ONLY)" "$PG_HBA"
    sed -i "$((FIRST_RULE+1)) a# ========================================" "$PG_HBA"
    sed -i "$((FIRST_RULE+2)) a host    all             ecom_app        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+3)) a host    all             ecom_app        ::1/128                 trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+4)) a host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+5)) a host    all             postgres        ::1/128                 trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+6)) a host    all             all             127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+7)) a host    all             all             ::1/128                 trust" "$PG_HBA"
fi

echo -e "${GREEN}✅ Rules updated${NC}"

# Show new rules
echo -e "\n${YELLOW}First 10 rules:${NC}"
grep -n "^[a-z]" "$PG_HBA" | head -10

# Full restart
echo -e "\n${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl stop postgresql
sleep 2
systemctl start postgresql
sleep 4

echo -e "${GREEN}✅ PostgreSQL restarted${NC}"
echo -e "\n${GREEN}✅ Trust authentication enabled for ALL users on localhost${NC}"
echo -e "${GREEN}✅ No password needed for any localhost connections${NC}\n"

echo -e "${GREEN}🚀 Run: ./dev.sh${NC}\n"

