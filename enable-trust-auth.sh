#!/bin/bash

# Enable trust authentication for localhost (development only)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Enabling Trust Authentication for Development${NC}\n"

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    echo -e "${RED}❌ Could not find pg_hba.conf${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found: ${PG_HBA}${NC}\n"

# Backup
BACKUP="${PG_HBA}.backup.trust.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"
echo -e "${GREEN}✅ Backup: ${BACKUP}${NC}\n"

# Remove all existing postgres TCP/IP rules
echo -e "${YELLOW}Removing old postgres TCP/IP rules...${NC}"
sed -i.bak '/^host.*all.*postgres.*127\.0\.0\.1/d' "$PG_HBA"
sed -i.bak '/^host.*all.*postgres.*::1/d' "$PG_HBA"
sed -i.bak '/^host.*all.*postgres.*localhost/d' "$PG_HBA"

# Add trust rules at the top
FIRST_LINE=$(grep -n "^[^#]" "$PG_HBA" | head -1 | cut -d: -f1)
if [ -n "$FIRST_LINE" ]; then
    sed -i "${FIRST_LINE}i# Trust authentication for postgres on localhost (DEVELOPMENT ONLY)" "$PG_HBA"
    sed -i "$((FIRST_LINE+1))i host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_LINE+2))i host    all             postgres        ::1/128                 trust" "$PG_HBA"
    echo -e "${GREEN}✅ Added trust rules at line ${FIRST_LINE}${NC}"
else
    echo "" >> "$PG_HBA"
    echo "# Trust authentication for postgres on localhost (DEVELOPMENT ONLY)" >> "$PG_HBA"
    echo "host    all             postgres        127.0.0.1/32            trust" >> "$PG_HBA"
    echo "host    all             postgres        ::1/128                 trust" >> "$PG_HBA"
    echo -e "${GREEN}✅ Added trust rules at end${NC}"
fi

# Show what was added
echo -e "\n${YELLOW}New rules added:${NC}"
grep -E "^host.*postgres.*trust" "$PG_HBA"

# Restart PostgreSQL
echo -e "\n${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl restart postgresql
sleep 3

# Test connection
echo -e "\n${YELLOW}🔍 Testing connection (should work without password)...${NC}"
psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Trust authentication works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Trust authentication is now enabled!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${YELLOW}⚠️  NOTE: This is less secure (no password required)${NC}"
    echo -e "${YELLOW}   Only use this for development!${NC}\n"
    echo -e "${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Connection still failing${NC}"
    echo -e "\n${YELLOW}Current pg_hba.conf rules for postgres:${NC}"
    grep -E "^host.*postgres|^local.*postgres" "$PG_HBA" || echo "None found"
    exit 1
fi

