#!/bin/bash

# Quick script to fix PostgreSQL connection issues

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing PostgreSQL Connection${NC}\n"

# Check if PostgreSQL is running
if ! pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running!${NC}"
    echo -e "\n${YELLOW}Try starting it:${NC}"
    echo -e "  ${GREEN}sudo systemctl start postgresql${NC}"
    echo -e "  ${GREEN}sudo service postgresql start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}\n"

# Create database if it doesn't exist
echo -e "${YELLOW}📦 Checking database...${NC}"
sudo -u postgres psql -c "CREATE DATABASE ecom_db;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database 'ecom_db' ready${NC}\n"
else
    echo -e "${YELLOW}⚠️  Database may already exist (this is OK)${NC}\n"
fi

# Test connection
echo -e "${YELLOW}🔐 Testing connection...${NC}"
echo -e "Current .env password: ${GREEN}postgres${NC}\n"

# Try to connect with postgres password
PGPASSWORD=postgres psql -U postgres -d ecom_db -c "SELECT 1;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection successful with password 'postgres'${NC}"
    echo -e "${GREEN}✅ Your .env file is correct!${NC}\n"
    exit 0
fi

echo -e "${RED}❌ Connection failed with password 'postgres'${NC}\n"
echo -e "${YELLOW}Your PostgreSQL password is different. Options:${NC}\n"
echo -e "${BLUE}Option 1:${NC} Run automated setup script (Recommended)"
echo -e "  ${GREEN}sudo ./setup-postgres.sh${NC}\n"
echo -e "${BLUE}Option 2:${NC} Set PostgreSQL password to 'postgres' manually"
echo -e "  ${GREEN}sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'postgres';\"${NC}\n"
echo -e "${BLUE}Option 3:${NC} Update backend/.env with your actual password"
echo -e "  Edit ${GREEN}backend/.env${NC} and change:"
echo -e "  ${GREEN}DB_PASSWORD=your_actual_password${NC}\n"
echo -e "${BLUE}Option 4:${NC} Find your PostgreSQL password"
echo -e "  Check your PostgreSQL configuration or ask your system admin\n"

