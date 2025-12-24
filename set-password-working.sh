#!/bin/bash

# Set password and make it work - uses trust first, then sets password

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Setting PostgreSQL Password (Working Method)${NC}\n"

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

# Step 1: Temporarily enable trust for ALL users on localhost
echo -e "${YELLOW}Step 1: Temporarily enabling trust for all localhost...${NC}"
BACKUP="${PG_HBA}.backup.password.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"

# Add trust rule at the very top for ALL users (temporary)
FIRST_RULE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)
sed -i "$((FIRST_RULE-1))a# TEMPORARY: Trust for all (to set password)" "$PG_HBA"
sed -i "$FIRST_RULE a host    all             all             127.0.0.1/32            trust" "$PG_HBA"
sed -i "$((FIRST_RULE+1)) a host    all             all             ::1/128                 trust" "$PG_HBA"

systemctl restart postgresql
sleep 3

# Step 2: Connect using trust and set password
echo -e "${YELLOW}Step 2: Setting password while connected via trust...${NC}"
psql -U postgres -d postgres -h 127.0.0.1 << 'PSQL'
-- Set password
ALTER USER postgres WITH PASSWORD 'postgres';

-- Verify it was set
SELECT 'Password set successfully' as status;
PSQL

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to set password${NC}"
    # Restore backup
    cp "$BACKUP" "$PG_HBA"
    systemctl restart postgresql
    exit 1
fi

# Step 3: Remove temporary trust rules, keep postgres-specific trust
echo -e "\n${YELLOW}Step 3: Removing temporary trust rules...${NC}"
sed -i '/# TEMPORARY: Trust for all/d' "$PG_HBA"
sed -i '/^host.*all.*all.*127\.0\.0\.1.*trust/d' "$PG_HBA"
sed -i '/^host.*all.*all.*::1.*trust/d' "$PG_HBA"

# Ensure postgres-specific trust rules exist at top
if ! grep -q "^host.*all.*postgres.*127.0.0.1.*trust" "$PG_HBA"; then
    FIRST_RULE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)
    sed -i "$((FIRST_RULE-1))a# Trust authentication for postgres (DEVELOPMENT)" "$PG_HBA"
    sed -i "$FIRST_RULE a host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+1)) a host    all             postgres        ::1/128                 trust" "$PG_HBA"
fi

# Step 4: Restart and test
echo -e "${YELLOW}Step 4: Restarting PostgreSQL...${NC}"
systemctl restart postgresql
sleep 3

# Test with trust (should work)
echo -e "\n${YELLOW}Step 5: Testing connection with trust...${NC}"
psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Trust auth works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Password set and trust authentication working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Still not working${NC}"
    echo -e "\n${YELLOW}Current rules:${NC}"
    grep -n "^host.*postgres\|^host.*all.*127" "$PG_HBA" | head -10
    
    echo -e "\n${YELLOW}Trying alternative: Create new user with password...${NC}"
    # Create a new user as fallback
    psql -U postgres -d postgres -h 127.0.0.1 << 'PSQL' 2>/dev/null
CREATE USER ecom_app WITH PASSWORD 'ecom_password';
ALTER USER ecom_app CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE ecom_db TO ecom_app;
\du ecom_app
PSQL
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Created new user 'ecom_app'${NC}"
        echo -e "${YELLOW}Update backend/.env with:${NC}"
        echo -e "  ${GREEN}DB_USER=ecom_app${NC}"
        echo -e "  ${GREEN}DB_PASSWORD=ecom_password${NC}"
    fi
    
    exit 1
fi

