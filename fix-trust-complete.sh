#!/bin/bash

# Complete fix - ensures trust rules are FIRST and reloads properly

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Complete Trust Authentication Fix${NC}\n"

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
BACKUP="${PG_HBA}.backup.complete.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"
echo -e "${GREEN}✅ Backup: ${BACKUP}${NC}\n"

# Show current rules order
echo -e "${YELLOW}Current rules (first 20 non-comment lines):${NC}"
grep -n "^[^#]" "$PG_HBA" | head -20

# Remove ALL postgres TCP/IP rules
echo -e "\n${YELLOW}Removing ALL postgres TCP/IP rules...${NC}"
sed -i.bak '/^host.*all.*postgres/d' "$PG_HBA"

# Find the VERY FIRST non-comment line
FIRST_NON_COMMENT=$(grep -n "^[^#]" "$PG_HBA" | head -1)
FIRST_LINE_NUM=$(echo "$FIRST_NON_COMMENT" | cut -d: -f1)

if [ -n "$FIRST_LINE_NUM" ]; then
    echo -e "${YELLOW}Inserting trust rules at line ${FIRST_LINE_NUM} (FIRST position)...${NC}"
    # Insert BEFORE the first rule
    sed -i "$((FIRST_LINE_NUM-1))a# Trust authentication for postgres (DEVELOPMENT - MUST BE FIRST)" "$PG_HBA"
    sed -i "$FIRST_LINE_NUM a host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_LINE_NUM+1)) a host    all             postgres        ::1/128                 trust" "$PG_HBA"
else
    # No rules found, append
    echo -e "${YELLOW}No existing rules, appending...${NC}"
    echo "" >> "$PG_HBA"
    echo "# Trust authentication for postgres (DEVELOPMENT - MUST BE FIRST)" >> "$PG_HBA"
    echo "host    all             postgres        127.0.0.1/32            trust" >> "$PG_HBA"
    echo "host    all             postgres        ::1/128                 trust" >> "$PG_HBA"
fi

# Show new rules
echo -e "\n${YELLOW}New rules (first 10 lines):${NC}"
head -10 "$PG_HBA" | grep -n "."

# Reload config
echo -e "\n${YELLOW}🔄 Reloading PostgreSQL configuration...${NC}"
sudo -u postgres psql -c "SELECT pg_reload_conf();" >/dev/null 2>&1

# Also restart to be sure
echo -e "${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl restart postgresql
sleep 4

# Verify config was loaded
echo -e "\n${YELLOW}Verifying configuration was loaded...${NC}"
sudo -u postgres psql -c "SHOW hba_file;" 2>&1

# Test connection
echo -e "\n${YELLOW}🔍 Testing connection...${NC}"
psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'SUCCESS: Trust auth works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Trust authentication is working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Still failing. Checking what rule is matching...${NC}"
    echo -e "\n${YELLOW}All rules in order:${NC}"
    grep -n "^[^#]" "$PG_HBA" | head -15
    
    echo -e "\n${YELLOW}PostgreSQL might be using a different config. Check:${NC}"
    echo -e "  ${GREEN}sudo -u postgres psql -c \"SHOW hba_file;\"${NC}"
    echo -e "  ${GREEN}sudo -u postgres psql -c \"SHOW config_file;\"${NC}"
    exit 1
fi

