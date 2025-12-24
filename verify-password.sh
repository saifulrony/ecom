#!/bin/bash

# Verify and fix PostgreSQL password

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verifying PostgreSQL Password${NC}\n"

# Check current password from .env
ENV_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$ENV_PASSWORD" ]; then
    ENV_PASSWORD="postgres"
fi

echo -e "Password in .env: ${GREEN}${ENV_PASSWORD}${NC}\n"

# Test connection with current password
echo -e "${YELLOW}Testing connection with password from .env...${NC}"
PGPASSWORD="${ENV_PASSWORD}" psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection successful! Password is correct.${NC}\n"
    echo -e "${GREEN}The issue might be elsewhere. Try running ./dev.sh again.${NC}\n"
    exit 0
fi

echo -e "${RED}❌ Connection failed with password from .env${NC}\n"

# Try to reset password
echo -e "${YELLOW}Attempting to reset password...${NC}"
echo -e "${YELLOW}You may need to enter your current PostgreSQL password or sudo password${NC}\n"

# Method 1: Using sudo to access postgres user
if sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${ENV_PASSWORD}';" 2>/dev/null; then
    echo -e "${GREEN}✅ Password reset via sudo${NC}"
elif sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null; then
    echo -e "${GREEN}✅ Password set to 'postgres'${NC}"
    echo -e "${YELLOW}⚠️  Updating .env to match...${NC}"
    sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' backend/.env
    ENV_PASSWORD="postgres"
else
    echo -e "${RED}❌ Could not reset password automatically${NC}"
    echo -e "\n${YELLOW}Please run manually:${NC}"
    echo -e "  ${GREEN}sudo -u postgres psql${NC}"
    echo -e "  Then run: ${GREEN}ALTER USER postgres PASSWORD 'postgres';${NC}"
    echo -e "  Then: ${GREEN}\\q${NC}"
    exit 1
fi

# Restart PostgreSQL to ensure changes take effect
echo -e "\n${YELLOW}🔄 Restarting PostgreSQL...${NC}"
sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null
sleep 2

# Test again
echo -e "\n${YELLOW}🔍 Testing connection again...${NC}"
PGPASSWORD="${ENV_PASSWORD}" psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection successful after password reset!${NC}\n"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Password is now working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Connection still failing${NC}\n"
    echo -e "${YELLOW}The issue might be with pg_hba.conf configuration.${NC}"
    echo -e "Run: ${GREEN}sudo ./fix-pg-auth.sh${NC} to fix authentication settings.\n"
    exit 1
fi

