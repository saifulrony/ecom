#!/bin/bash

# Add trust authentication for ecom_app user

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

echo -e "${BLUE}🔧 Adding Trust Authentication for ecom_app${NC}\n"

# Remove old ecom_app rules
sed -i.bak '/^host.*all.*ecom_app/d' "$PG_HBA"

# Add trust rules at the top
FIRST_RULE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)
if [ -n "$FIRST_RULE" ]; then
    sed -i "$((FIRST_RULE-1))a# Trust for ecom_app (DEVELOPMENT)" "$PG_HBA"
    sed -i "$FIRST_RULE a host    all             ecom_app        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+1)) a host    all             ecom_app        ::1/128                 trust" "$PG_HBA"
fi

# Restart
systemctl restart postgresql
sleep 3

# Test
psql -U ecom_app -d ecom_db -h 127.0.0.1 -c "SELECT 'Trust works for ecom_app!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Trust authentication enabled for ecom_app!${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
else
    echo -e "\n${RED}❌ Still failing${NC}"
    exit 1
fi

