#!/bin/bash

# Set password using peer authentication (Unix socket) - this always works

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Setting Password Using Peer Authentication${NC}\n"

# Step 1: Set password using peer auth (Unix socket) - this always works
echo -e "${YELLOW}Step 1: Setting password using peer authentication...${NC}"
sudo -u postgres psql << 'PSQL'
-- Set password
ALTER USER postgres WITH PASSWORD 'postgres';

-- Verify
SELECT 'Password set: ' || rolname as status FROM pg_roles WHERE rolname = 'postgres';
PSQL

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to set password${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Password set successfully${NC}\n"

# Step 2: Ensure pg_hba.conf has trust for postgres
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

echo -e "${YELLOW}Step 2: Ensuring trust rules are at the top...${NC}"

# Remove all postgres TCP/IP rules
sed -i.bak '/^host.*all.*postgres/d' "$PG_HBA"

# Add at the very first rule position
FIRST_RULE=$(grep -n "^[a-z]" "$PG_HBA" | head -1 | cut -d: -f1)
if [ -n "$FIRST_RULE" ]; then
    sed -i "$((FIRST_RULE-1))a# Trust for postgres (DEVELOPMENT)" "$PG_HBA"
    sed -i "$FIRST_RULE a host    all             postgres        127.0.0.1/32            trust" "$PG_HBA"
    sed -i "$((FIRST_RULE+1)) a host    all             postgres        ::1/128                 trust" "$PG_HBA"
fi

# Step 3: Full restart
echo -e "${YELLOW}Step 3: Restarting PostgreSQL...${NC}"
systemctl stop postgresql
sleep 2
systemctl start postgresql
sleep 4

# Step 4: Test with trust
echo -e "${YELLOW}Step 4: Testing with trust authentication...${NC}"
psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Trust works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Success! Trust authentication is working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
fi

# Step 5: If trust doesn't work, try password
echo -e "\n${YELLOW}Step 5: Testing with password authentication...${NC}"
PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Password works!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Success! Password authentication is working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
fi

# Step 6: Last resort - create new user
echo -e "\n${YELLOW}Step 6: Creating new user as fallback...${NC}"
sudo -u postgres psql << 'PSQL'
CREATE USER ecom_app WITH PASSWORD 'ecom_password';
ALTER USER ecom_app CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE ecom_db TO ecom_app;
ALTER USER ecom_app WITH SUPERUSER;
\du ecom_app
PSQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Created user 'ecom_app'${NC}"
    echo -e "\n${YELLOW}Update backend/.env:${NC}"
    echo -e "  ${GREEN}DB_USER=ecom_app${NC}"
    echo -e "  ${GREEN}DB_PASSWORD=ecom_password${NC}"
    echo -e "\n${BLUE}Then run: ${NC}./dev.sh\n"
    exit 0
fi

echo -e "\n${RED}❌ All methods failed${NC}"
exit 1

