#!/bin/bash

# Final fix - checks everything and uses trust method as fallback

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Final Password Fix (v2)${NC}\n"

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

# Check current pg_hba.conf
echo -e "${YELLOW}Current pg_hba.conf rules (first 15 lines, non-comment):${NC}"
grep -v "^#" "$PG_HBA" | grep -v "^$" | head -15

# Check password hash
echo -e "\n${YELLOW}Current password hash:${NC}"
sudo -u postgres psql -c "SELECT usename, substring(passwd, 1, 20) || '...' as hash FROM pg_shadow WHERE usename = 'postgres';" 2>&1

# Strategy: Use trust for localhost temporarily, then switch to md5
echo -e "\n${YELLOW}Strategy: Adding trust method for localhost (temporary)${NC}"
BACKUP="${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"

# Remove all postgres TCP/IP rules
sed -i.bak '/^host.*postgres/d' "$PG_HBA"

# Add trust rule at the top for testing
FIRST_LINE=$(grep -n "^[^#]" "$PG_HBA" | head -1 | cut -d: -f1)
if [ -n "$FIRST_LINE" ]; then
    sed -i "${FIRST_LINE}i# Trust for postgres on localhost (temporary - for testing)" "$PG_HBA"
    sed -i "$((FIRST_LINE+1))i host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_LINE+2))i host    all             postgres        ::1/128                 trust" "$PG_HBA"
fi

echo -e "${GREEN}✅ Added trust rules${NC}"

# Restart
systemctl restart postgresql
sleep 3

# Test with trust (should work)
echo -e "\n${YELLOW}Testing with trust authentication...${NC}"
psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Trust auth works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Trust authentication works!${NC}"
    echo -e "\n${YELLOW}Now setting password and switching to md5...${NC}"
    
    # Set password while using trust
    psql -U postgres -d ecom_db -h 127.0.0.1 -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>&1
    
    # Change trust to md5
    sed -i 's/^host.*postgres.*127\.0\.0\.1.*trust/host    all             postgres        127.0.0.1\/32            md5/' "$PG_HBA"
    sed -i 's/^host.*postgres.*::1.*trust/host    all             postgres        ::1\/128                 md5/' "$PG_HBA"
    
    # Restart
    systemctl restart postgresql
    sleep 3
    
    # Test with password
    echo -e "\n${YELLOW}Testing with password authentication...${NC}"
    PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Password auth works!' as status;" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ Password authentication is now working!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "\n${BLUE}You can now run:${NC}"
        echo -e "  ${GREEN}./dev.sh${NC}\n"
        exit 0
    else
        echo -e "${RED}❌ Password auth still failing${NC}"
        echo -e "${YELLOW}Keeping trust method for now (less secure but works)${NC}"
        echo -e "${YELLOW}You can manually change trust to md5 later${NC}\n"
        exit 1
    fi
else
    echo -e "${RED}❌ Even trust authentication failed${NC}"
    echo -e "${YELLOW}This suggests a deeper PostgreSQL configuration issue${NC}\n"
    exit 1
fi

