#!/bin/bash

# Comprehensive PostgreSQL setup script

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🗄️  PostgreSQL Setup for Ecommerce${NC}\n"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    echo -e "${YELLOW}⚠️  This script needs sudo access to configure PostgreSQL${NC}"
    echo -e "Please run with: ${GREEN}sudo ./setup-postgres.sh${NC}"
    exit 1
fi

# Function to run psql commands
run_psql() {
    if [ "$EUID" -eq 0 ]; then
        sudo -u postgres psql "$@"
    else
        sudo -u postgres psql "$@"
    fi
}

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed!${NC}"
    echo -e "\n${YELLOW}Install it with:${NC}"
    echo -e "  ${GREEN}sudo apt-get update && sudo apt-get install postgresql postgresql-contrib${NC}"
    echo -e "  ${GREEN}# OR on RHEL/CentOS:${NC}"
    echo -e "  ${GREEN}sudo yum install postgresql-server postgresql-contrib${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting it...${NC}"
    if systemctl start postgresql 2>/dev/null || service postgresql start 2>/dev/null; then
        sleep 2
        if pg_isready -U postgres >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL started${NC}\n"
        else
            echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
            echo -e "Try manually: ${GREEN}sudo systemctl start postgresql${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Could not start PostgreSQL${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ PostgreSQL is running${NC}\n"
fi

# Set password
echo -e "${YELLOW}🔐 Setting PostgreSQL password to 'postgres'...${NC}"
run_psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Password set successfully${NC}"
    echo -e "${YELLOW}🔄 Restarting PostgreSQL to apply changes...${NC}"
    systemctl restart postgresql 2>/dev/null || service postgresql restart 2>/dev/null
    sleep 2
    echo -e "${GREEN}✅ PostgreSQL restarted${NC}\n"
else
    echo -e "${RED}❌ Failed to set password${NC}"
    echo -e "You may need to edit pg_hba.conf to allow password authentication"
    exit 1
fi

# Create database
echo -e "${YELLOW}📦 Creating database 'ecom_db'...${NC}"
run_psql -c "SELECT 1 FROM pg_database WHERE datname='ecom_db'" | grep -q 1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database 'ecom_db' already exists${NC}\n"
else
    run_psql -c "CREATE DATABASE ecom_db;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database 'ecom_db' created${NC}\n"
    else
        echo -e "${RED}❌ Failed to create database${NC}"
        exit 1
    fi
fi

# Fix pg_hba.conf to allow password authentication
echo -e "${YELLOW}🔧 Configuring authentication...${NC}"
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -n "$PG_HBA" ] && [ -f "$PG_HBA" ]; then
    # Backup
    BACKUP="${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$PG_HBA" "$BACKUP" 2>/dev/null
    
    # Add password authentication for localhost if not present
    if ! grep -q "^host.*all.*postgres.*127.0.0.1/32.*md5" "$PG_HBA"; then
        echo "" >> "$PG_HBA"
        echo "# Allow password authentication for postgres user" >> "$PG_HBA"
        echo "host    all             postgres        127.0.0.1/32            md5" >> "$PG_HBA"
        echo "host    all             postgres        ::1/128                 md5" >> "$PG_HBA"
        echo -e "${GREEN}✅ Updated pg_hba.conf${NC}"
    fi
fi

# Restart PostgreSQL (not just reload) to apply all changes
echo -e "${YELLOW}🔄 Restarting PostgreSQL (full restart)...${NC}"
systemctl restart postgresql 2>/dev/null || service postgresql restart 2>/dev/null
sleep 3

# Test connection (try multiple methods)
echo -e "${YELLOW}🔍 Testing connection...${NC}"

# Method 1: Using PGPASSWORD with 127.0.0.1 (what the app uses)
PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection test successful!${NC}\n"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ PostgreSQL is ready!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
fi

# Method 2: Try with localhost
PGPASSWORD=postgres psql -U postgres -d ecom_db -h localhost -c "SELECT 1;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection test successful!${NC}\n"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ PostgreSQL is ready!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Connection test failed${NC}"
    echo -e "\n${YELLOW}Troubleshooting:${NC}"
    echo -e "1. Check pg_hba.conf authentication method"
    echo -e "2. Restart PostgreSQL: ${GREEN}sudo systemctl restart postgresql${NC}"
    echo -e "3. Try connecting manually: ${GREEN}psql -U postgres${NC}"
    exit 1
fi

