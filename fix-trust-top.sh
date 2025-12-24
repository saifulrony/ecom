#!/bin/bash

# Put trust rules at the absolute top of pg_hba.conf

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Moving Trust Rules to Absolute Top${NC}\n"

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

echo -e "${GREEN}✅ Found: ${PG_HBA}${NC}\n"

# Backup
BACKUP="${PG_HBA}.backup.top.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"
echo -e "${GREEN}✅ Backup: ${BACKUP}${NC}\n"

# Remove ALL postgres TCP/IP rules
sed -i.bak '/^host.*all.*postgres/d' "$PG_HBA"

# Find where the actual rules start (after header comments)
# Look for the first "local" or "host" rule
FIRST_RULE_LINE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)

if [ -z "$FIRST_RULE_LINE" ]; then
    FIRST_RULE_LINE=1
fi

echo -e "${YELLOW}First actual rule is at line ${FIRST_RULE_LINE}${NC}"
echo -e "${YELLOW}Inserting trust rules BEFORE line ${FIRST_RULE_LINE}${NC}\n"

# Insert trust rules right before the first rule
sed -i "$((FIRST_RULE_LINE-1))a# ========================================" "$PG_HBA"
sed -i "$FIRST_RULE_LINE a# Trust authentication for postgres (DEVELOPMENT - MUST BE FIRST)" "$PG_HBA"
sed -i "$((FIRST_RULE_LINE+1)) a# ========================================" "$PG_HBA"
sed -i "$((FIRST_RULE_LINE+2)) a host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
sed -i "$((FIRST_RULE_LINE+3)) a host    all             postgres        ::1/128                 trust" "$PG_HBA"

# Show what we added
echo -e "${GREEN}✅ Trust rules added at the top${NC}"
echo -e "\n${YELLOW}First 15 lines of pg_hba.conf:${NC}"
head -15 "$PG_HBA" | cat -n

# Force full restart
echo -e "\n${YELLOW}🔄 Stopping PostgreSQL...${NC}"
systemctl stop postgresql
sleep 2
echo -e "${YELLOW}🔄 Starting PostgreSQL...${NC}"
systemctl start postgresql
sleep 4

# Verify it's running
if ! pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL failed to start!${NC}"
    echo -e "${YELLOW}Check logs: sudo tail -20 /var/log/postgresql/postgresql-*-main.log${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}\n"

# Test connection
echo -e "${YELLOW}🔍 Testing connection (should work without password)...${NC}"
psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'SUCCESS: Trust authentication works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Trust authentication is now working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Still failing${NC}"
    echo -e "\n${YELLOW}Current rule order (first 20):${NC}"
    grep -n "^[a-z]" "$PG_HBA" | head -20
    
    echo -e "\n${YELLOW}Try checking if there are include directives:${NC}"
    grep -i "include" "$PG_HBA" || echo "No include directives found"
    
    echo -e "\n${YELLOW}PostgreSQL version and config:${NC}"
    sudo -u postgres psql -c "SELECT version();" 2>&1 | head -1
    exit 1
fi

