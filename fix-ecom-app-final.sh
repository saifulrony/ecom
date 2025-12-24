#!/bin/bash

# Final fix - ensures ecom_app trust rules are FIRST and working

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Need sudo${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Final Fix for ecom_app Authentication${NC}\n"

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs | xargs)

if [ -z "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

echo -e "${GREEN}Using: ${PG_HBA}${NC}\n"

# Backup
cp "$PG_HBA" "${PG_HBA}.backup.final.$(date +%Y%m%d_%H%M%S)"

# Remove ALL ecom_app rules
sed -i.bak '/^host.*all.*ecom_app/d' "$PG_HBA"

# Find the absolute first rule (after comments)
FIRST_RULE_LINE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)

if [ -z "$FIRST_RULE_LINE" ]; then
    echo -e "${RED}❌ No rules found in pg_hba.conf${NC}"
    exit 1
fi

echo -e "${YELLOW}First rule is at line ${FIRST_RULE_LINE}${NC}"
echo -e "${YELLOW}Inserting ecom_app trust rules BEFORE line ${FIRST_RULE_LINE}${NC}\n"

# Insert trust rules RIGHT BEFORE the first rule
sed -i "$((FIRST_RULE_LINE-1))a# ========================================" "$PG_HBA"
sed -i "$FIRST_RULE_LINE a# Trust for ecom_app - MUST BE FIRST" "$PG_HBA"
sed -i "$((FIRST_RULE_LINE+1)) a# ========================================" "$PG_HBA"
sed -i "$((FIRST_RULE_LINE+2)) a host    all             ecom_app        127.0.0.1/32            trust" "$PG_HBA"
sed -i "$((FIRST_RULE_LINE+3)) a host    all             ecom_app        ::1/128                 trust" "$PG_HBA"

# Show what we added
echo -e "${GREEN}✅ Rules added. First 5 rules now:${NC}"
grep -n "^[a-z]" "$PG_HBA" | head -5

# Full restart
echo -e "\n${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl stop postgresql
sleep 2
systemctl start postgresql
sleep 4

# Verify PostgreSQL is running
if ! pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL failed to start!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL restarted${NC}\n"

# Test connection (this should work with trust)
echo -e "${YELLOW}🔍 Testing connection...${NC}"
psql -U ecom_app -d ecom_db -h 127.0.0.1 -c "SELECT 'SUCCESS: Trust works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Trust authentication is working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    echo -e "${BLUE}Your website will be at:${NC}"
    echo -e "  ${GREEN}http://localhost:10001${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Still failing. Showing error:${NC}"
    psql -U ecom_app -d ecom_db -h 127.0.0.1 -c "SELECT 1;" 2>&1 | head -3
    
    echo -e "\n${YELLOW}Current rules for ecom_app:${NC}"
    grep -n "ecom_app" "$PG_HBA" || echo "None found!"
    
    echo -e "\n${YELLOW}All rules in order (first 10):${NC}"
    grep -n "^[a-z]" "$PG_HBA" | head -10
    
    exit 1
fi

