#!/bin/bash

# Fix PostgreSQL authentication to allow password login

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing PostgreSQL Authentication${NC}\n"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script needs sudo access${NC}"
    echo -e "Run: ${GREEN}sudo ./fix-pg-auth.sh${NC}"
    exit 1
fi

# Find pg_hba.conf
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    # Try common locations
    for loc in /etc/postgresql/*/main/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf; do
        if [ -f "$loc" ]; then
            PG_HBA="$loc"
            break
        fi
    done
fi

if [ -z "$PG_HBA" ] || [ ! -f "$PG_HBA" ]; then
    echo -e "${RED}❌ Could not find pg_hba.conf${NC}"
    echo -e "Try: ${GREEN}sudo find / -name pg_hba.conf 2>/dev/null${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found pg_hba.conf: ${PG_HBA}${NC}\n"

# Backup
BACKUP="${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PG_HBA" "$BACKUP"
echo -e "${GREEN}✅ Backup created: ${BACKUP}${NC}\n"

# Check current config
echo -e "${YELLOW}Current authentication settings:${NC}"
grep -E "^[^#].*postgres" "$PG_HBA" | head -3 || echo "No postgres user rules found"

# Update pg_hba.conf to allow password authentication for localhost
echo -e "\n${YELLOW}Updating pg_hba.conf...${NC}"

# Comment out existing local postgres lines and add new ones
sed -i.bak '/^local.*postgres/s/^/# /' "$PG_HBA"
sed -i.bak '/^host.*127\.0\.0\.1.*postgres/s/^/# /' "$PG_HBA"
sed -i.bak '/^host.*localhost.*postgres/s/^/# /' "$PG_HBA"

# Add new rules for password authentication
if ! grep -q "^host.*all.*postgres.*127.0.0.1/32.*md5" "$PG_HBA"; then
    echo "" >> "$PG_HBA"
    echo "# Allow password authentication for postgres user" >> "$PG_HBA"
    echo "host    all             postgres        127.0.0.1/32            md5" >> "$PG_HBA"
    echo "host    all             postgres        ::1/128                 md5" >> "$PG_HBA"
fi

echo -e "${GREEN}✅ pg_hba.conf updated${NC}\n"

# Reload PostgreSQL
echo -e "${YELLOW}🔄 Reloading PostgreSQL configuration...${NC}"
sudo -u postgres psql -c "SELECT pg_reload_conf();" >/dev/null 2>&1
systemctl reload postgresql 2>/dev/null || service postgresql reload 2>/dev/null

sleep 1

# Set password again
echo -e "${YELLOW}🔐 Setting password...${NC}"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null 2>&1

# Test connection
echo -e "${YELLOW}🔍 Testing connection...${NC}"
PGPASSWORD=postgres psql -U postgres -d ecom_db -h localhost -c "SELECT 1;" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection successful!${NC}\n"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ PostgreSQL authentication fixed!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${BLUE}You can now run:${NC}"
    echo -e "  ${GREEN}./dev.sh${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Connection still failing${NC}"
    echo -e "\n${YELLOW}Try restarting PostgreSQL:${NC}"
    echo -e "  ${GREEN}sudo systemctl restart postgresql${NC}"
    echo -e "\n${YELLOW}Then test:${NC}"
    echo -e "  ${GREEN}PGPASSWORD=postgres psql -U postgres -d ecom_db -h localhost -c 'SELECT 1;'${NC}"
    exit 1
fi

