#!/bin/bash

# Direct password verification and fix

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Direct Password Verification${NC}\n"

# Connect without password (using peer auth) and check password
echo -e "${YELLOW}Checking current password status...${NC}"
sudo -u postgres psql -c "\du postgres" 2>&1

echo -e "\n${YELLOW}Setting password using multiple methods...${NC}"

# Method 1: Direct SQL
echo -e "${BLUE}Method 1: Direct ALTER USER...${NC}"
sudo -u postgres psql << 'PSQL'
ALTER USER postgres WITH PASSWORD 'postgres';
SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname = 'postgres';
\q
PSQL

# Method 2: Using psql -c
echo -e "\n${BLUE}Method 2: Using psql -c...${NC}"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Verify password hash
echo -e "\n${YELLOW}Checking password hash in pg_shadow...${NC}"
sudo -u postgres psql -c "SELECT rolname, substring(rolpassword, 1, 20) as password_hash FROM pg_shadow WHERE rolname = 'postgres';" 2>&1

# Restart
echo -e "\n${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl restart postgresql
sleep 3

# Test with different connection methods
echo -e "\n${YELLOW}Testing connections...${NC}"

echo -e "${BLUE}Test 1: 127.0.0.1 with password...${NC}"
PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 'Connection successful!' as status;" 2>&1

echo -e "\n${BLUE}Test 2: localhost with password...${NC}"
PGPASSWORD=postgres psql -U postgres -d ecom_db -h localhost -c "SELECT 'Connection successful!' as status;" 2>&1

echo -e "\n${BLUE}Test 3: Connection string...${NC}"
PGPASSWORD=postgres psql "postgresql://postgres:postgres@127.0.0.1:5432/ecom_db" -c "SELECT 'Connection successful!' as status;" 2>&1

