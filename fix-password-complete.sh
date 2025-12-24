#!/bin/bash

# Complete password fix - tries everything

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Complete PostgreSQL Password Fix${NC}\n"

# Step 1: Drop and recreate postgres user (nuclear option)
echo -e "${YELLOW}Step 1: Ensuring postgres user exists with correct permissions...${NC}"
sudo -u postgres psql << 'PSQL'
-- Ensure postgres user can login
ALTER USER postgres WITH LOGIN;
ALTER USER postgres WITH SUPERUSER;
ALTER USER postgres WITH CREATEDB;
ALTER USER postgres WITH CREATEROLE;
\du postgres
PSQL

# Step 2: Set password multiple times to ensure it sticks
echo -e "\n${YELLOW}Step 2: Setting password (multiple attempts)...${NC}"
for i in {1..3}; do
    echo -e "${BLUE}Attempt $i...${NC}"
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>&1
    sleep 1
done

# Step 3: Verify pg_hba.conf
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)
echo -e "\n${YELLOW}Step 3: Verifying pg_hba.conf...${NC}"
echo -e "File: ${PG_HBA}"
echo -e "\nRelevant rules:"
grep -E "^host.*postgres|^local.*postgres" "$PG_HBA" 2>/dev/null || echo "None found"

# Ensure rules are correct
if ! grep -q "^host.*all.*postgres.*127.0.0.1/32.*md5" "$PG_HBA"; then
    echo -e "\n${YELLOW}Adding password auth rules...${NC}"
    sed -i '/^# IPv4 local connections:/a host    all             postgres        127.0.0.1/32            md5' "$PG_HBA"
    sed -i '/^# IPv6 local connections:/a host    all             postgres        ::1/128                 md5' "$PG_HBA"
fi

# Step 4: Check PostgreSQL version and password encryption
echo -e "\n${YELLOW}Step 4: Checking PostgreSQL configuration...${NC}"
sudo -u postgres psql -c "SHOW password_encryption;" 2>&1
sudo -u postgres psql -c "SHOW ssl;" 2>&1

# Step 5: Force password reset using different method
echo -e "\n${YELLOW}Step 5: Force password reset...${NC}"
sudo -u postgres psql << 'PSQL'
-- Drop and recreate to ensure clean state
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
        ALTER USER postgres WITH PASSWORD 'postgres';
    END IF;
END
$$;
SELECT 'Password reset complete' as status;
PSQL

# Step 6: Restart PostgreSQL
echo -e "\n${YELLOW}Step 6: Restarting PostgreSQL...${NC}"
systemctl stop postgresql
sleep 2
systemctl start postgresql
sleep 4

# Step 7: Final test
echo -e "\n${YELLOW}Step 7: Final connection test...${NC}"
PGPASSWORD=postgres timeout 5 psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'SUCCESS' as connection_test;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Password authentication is now working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
else
    echo -e "\n${RED}❌ Still failing. Checking logs...${NC}"
    echo -e "\n${YELLOW}Recent PostgreSQL log entries:${NC}"
    sudo tail -10 /var/log/postgresql/postgresql-*-main.log 2>/dev/null | grep -i "password\|auth\|fatal" || sudo tail -10 /var/log/postgresql/postgresql-*-main.log 2>/dev/null
    
    echo -e "\n${YELLOW}Try manual verification:${NC}"
    echo -e "  ${GREEN}sudo -u postgres psql${NC}"
    echo -e "  Then: ${GREEN}ALTER USER postgres PASSWORD 'postgres';${NC}"
    echo -e "  Then: ${GREEN}\\q${NC}"
    echo -e "  Then: ${GREEN}PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1${NC}"
fi

