#!/bin/bash

# Script to force seed products in the database

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌱 Seeding Products to Database${NC}\n"

cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please create it first.${NC}"
    exit 1
fi

# Run Go seed program
echo -e "${YELLOW}Connecting to database and seeding products...${NC}\n"

go run cmd/seed/main.go

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Products seeded successfully!${NC}"
    echo -e "\n${BLUE}Restart your backend to see the products:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
else
    echo -e "\n${RED}❌ Failed to seed products. Check the error above.${NC}\n"
    exit 1
fi

