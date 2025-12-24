#!/bin/bash

# Final working password fix - uses peer auth to set password correctly

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Need sudo${NC}"
    exit 1
fi

echo -e "${GREEN}🔐 Setting ecom_app Password (Final Fix)${NC}\n"

# Connect using peer auth (always works) and set password
sudo -u postgres psql << 'PSQL'
-- Ensure user exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecom_app') THEN
        CREATE USER ecom_app WITH PASSWORD 'ecom_password';
    END IF;
END
$$;

-- Set password multiple times to ensure it sticks
ALTER USER ecom_app WITH PASSWORD 'ecom_password';
ALTER USER ecom_app WITH PASSWORD 'ecom_password';
ALTER USER ecom_app WITH PASSWORD 'ecom_password';

-- Grant permissions
ALTER USER ecom_app CREATEDB;
ALTER USER ecom_app WITH SUPERUSER;

-- Ensure database exists
SELECT 'Database check' as status;
\c ecom_db

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ecom_db TO ecom_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecom_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecom_app;

-- Verify
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'ecom_app';
PSQL

echo ""
echo -e "${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl restart postgresql
sleep 3

echo ""
echo -e "${YELLOW}🔍 Testing connection...${NC}"
PGPASSWORD=ecom_password psql -U ecom_app -d ecom_db -h 127.0.0.1 -c "SELECT 'SUCCESS!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Password authentication is working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${GREEN}✅ Password: ecom_password${NC}"
    echo -e "${GREEN}✅ User: ecom_app${NC}"
    echo -e "\n${GREEN}🚀 Run: ./dev.sh${NC}\n"
    exit 0
else
    echo -e "\n${RED}❌ Still failing. Creating alternative user...${NC}"
    
    sudo -u postgres psql << 'PSQL'
DROP USER IF EXISTS ecom_user;
CREATE USER ecom_user WITH PASSWORD 'postgres123';
ALTER USER ecom_user CREATEDB;
ALTER USER ecom_user WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE ecom_db TO ecom_user;
\du ecom_user
PSQL
    
    # Update .env automatically
    cd /home/saiful/ecom/backend
    sed -i 's/^DB_USER=.*/DB_USER=ecom_user/' .env
    sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres123/' .env
    
    echo -e "\n${GREEN}✅ Created ecom_user and updated .env${NC}"
    echo -e "${GREEN}✅ User: ecom_user${NC}"
    echo -e "${GREEN}✅ Password: postgres123${NC}"
    echo -e "\n${YELLOW}Testing new user...${NC}"
    
    PGPASSWORD=postgres123 psql -U ecom_user -d ecom_db -h 127.0.0.1 -c "SELECT 'SUCCESS!' as status;" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ New user works!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "\n${GREEN}🚀 Run: ./dev.sh${NC}\n"
        exit 0
    else
        echo -e "\n${RED}❌ Even new user failed${NC}"
        echo -e "${YELLOW}This suggests a deeper PostgreSQL configuration issue${NC}"
        exit 1
    fi
fi

