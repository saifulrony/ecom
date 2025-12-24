#!/bin/bash

# Script to help setup PostgreSQL database and password

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🗄️  PostgreSQL Database Setup${NC}\n"

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql && ! pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL doesn't seem to be running.${NC}"
    echo -e "Try starting it with: ${GREEN}sudo systemctl start postgresql${NC}\n"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}\n"

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='ecom_db'" 2>/dev/null)

if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${YELLOW}📦 Creating database 'ecom_db'...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE ecom_db;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database 'ecom_db' created${NC}\n"
    else
        echo -e "${RED}❌ Failed to create database. You may need to run:${NC}"
        echo -e "   ${GREEN}sudo -u postgres psql -c \"CREATE DATABASE ecom_db;\"${NC}\n"
    fi
else
    echo -e "${GREEN}✅ Database 'ecom_db' already exists${NC}\n"
fi

# Get current password or set new one
echo -e "${YELLOW}🔐 PostgreSQL Password Configuration${NC}"
echo -e "The default password in .env is: ${GREEN}postgres${NC}"
echo -e "\nIf your PostgreSQL password is different, you have two options:"
echo -e "\n${BLUE}Option 1:${NC} Update the password in backend/.env file"
echo -e "   Edit: ${GREEN}backend/.env${NC}"
echo -e "   Change: ${GREEN}DB_PASSWORD=your_actual_password${NC}"
echo -e "\n${BLUE}Option 2:${NC} Set PostgreSQL password to 'postgres'"
echo -e "   Run: ${GREEN}sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'postgres';\"${NC}"
echo -e "\n${BLUE}Option 3:${NC} Test connection with current password"
echo -e "   Run: ${GREEN}psql -U postgres -d ecom_db -c 'SELECT 1;'${NC}"
echo -e "   (It will prompt for password)"

