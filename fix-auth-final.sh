#!/bin/bash

# Final fix for PostgreSQL authentication

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    echo -e "Run: ${GREEN}sudo ./fix-auth-final.sh${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Final PostgreSQL Authentication Fix${NC}\n"

# Find pg_hba.conf
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    for loc in /etc/postgresql/*/main/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    echo -e "${RED}❌ Could not find pg_hba.conf${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found: ${PG_HBA}${NC}\n"

# Backup
BACKUP="${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"
echo -e "${GREEN}✅ Backup: ${BACKUP}${NC}\n"

# Show current postgres rules
echo -e "${YELLOW}Current postgres authentication rules:${NC}"
grep -E "^[^#].*postgres" "$PG_HBA" || echo "None found"

# Remove old postgres rules for TCP/IP
echo -e "\n${YELLOW}Updating pg_hba.conf...${NC}"
sed -i.bak '/^host.*postgres.*127\.0\.0\.1/d' "$PG_HBA"
sed -i.bak '/^host.*postgres.*::1/d' "$PG_HBA"
sed -i.bak '/^host.*postgres.*localhost/d' "$PG_HBA"

# Add new rules at the top (order matters in pg_hba.conf)
# Find the first non-comment line and add before it
FIRST_LINE=$(grep -n "^[^#]" "$PG_HBA" | head -1 | cut -d: -f1)
if [ -n "$FIRST_LINE" ]; then
    sed -i "${FIRST_LINE}i# Password authentication for postgres user (added by fix script)" "$PG_HBA"
    sed -i "$((FIRST_LINE+1))i host    all             postgres        127.0.0.1/32            md5" "$PG_HBA"
    sed -i "$((FIRST_LINE+2))i host    all             postgres        ::1/128                 md5" "$PG_HBA"
else
    # Append if no rules found
    echo "" >> "$PG_HBA"
    echo "# Password authentication for postgres user (added by fix script)" >> "$PG_HBA"
    echo "host    all             postgres        127.0.0.1/32            md5" >> "$PG_HBA"
    echo "host    all             postgres        ::1/128                 md5" >> "$PG_HBA"
fi

echo -e "${GREEN}✅ pg_hba.conf updated${NC}\n"

# Set password
echo -e "${YELLOW}🔐 Setting password...${NC}"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" >/dev/null 2>&1
echo -e "${GREEN}✅ Password set${NC}\n"

# Restart PostgreSQL
echo -e "${YELLOW}🔄 Restarting PostgreSQL...${NC}"
systemctl restart postgresql 2>/dev/null || service postgresql restart 2>/dev/null
sleep 4

# Test connection
echo -e "${YELLOW}🔍 Testing connection...${NC}"
PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection successful!${NC}\n"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ PostgreSQL authentication is now working!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Connection still failing${NC}\n"
    echo -e "${YELLOW}Showing test output:${NC}"
    PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;" 2>&1
    
    echo -e "\n${YELLOW}Current pg_hba.conf rules for postgres:${NC}"
    grep -E "^host.*postgres|^local.*postgres" "$PG_HBA" || echo "None found"
    
    echo -e "\n${YELLOW}Try checking PostgreSQL logs:${NC}"
    echo -e "  ${GREEN}sudo tail -30 /var/log/postgresql/postgresql-*-main.log${NC}"
    exit 1
fi

