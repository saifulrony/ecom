#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Stop existing processes first
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"

# Kill processes on ports 10000 (backend) and 10001 (frontend)
BACKEND_OLD_PID=$(lsof -ti:10000 2>/dev/null || true)
FRONTEND_OLD_PID=$(lsof -ti:10001 2>/dev/null || true)

if [ ! -z "$BACKEND_OLD_PID" ]; then
    echo -e "${YELLOW}  Stopping backend on port 10000 (PID: $BACKEND_OLD_PID)...${NC}"
    kill $BACKEND_OLD_PID 2>/dev/null || true
    sleep 1
fi

if [ ! -z "$FRONTEND_OLD_PID" ]; then
    echo -e "${YELLOW}  Stopping frontend on port 10001 (PID: $FRONTEND_OLD_PID)...${NC}"
    kill $FRONTEND_OLD_PID 2>/dev/null || true
    sleep 1
fi

# Also kill any Go processes and Next.js processes from this project
pkill -f "go run.*main.go" 2>/dev/null || true
pkill -f "next dev.*10001" 2>/dev/null || true

# Wait a moment for processes to fully stop
sleep 2
echo -e "${GREEN}✅ Stopped existing processes${NC}\n"

echo -e "${BLUE}🚀 Starting Ecommerce Development Servers${NC}\n"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed. Please install Go 1.21+${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

# Function to test database connection
test_db_connection() {
    local db_password=$1
    PGPASSWORD="$db_password" psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;" >/dev/null 2>&1
    return $?
}

# Function to auto-fix PostgreSQL authentication
auto_fix_postgres() {
    echo -e "${YELLOW}🔧 Attempting to auto-fix PostgreSQL authentication...${NC}"
    
    # Check if we can use sudo
    if sudo -n true 2>/dev/null; then
        # Try to set password
        echo -e "${YELLOW}  Setting postgres password...${NC}"
        sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null 2>&1
        
        # Try to fix pg_hba.conf
        PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | xargs)
        if [ -n "$PG_HBA" ] && [ -f "$PG_HBA" ]; then
            if ! grep -q "^host.*all.*postgres.*127.0.0.1/32.*md5" "$PG_HBA"; then
                echo -e "${YELLOW}  Updating pg_hba.conf...${NC}"
                echo "" | sudo tee -a "$PG_HBA" >/dev/null
                echo "# Allow password authentication for postgres user" | sudo tee -a "$PG_HBA" >/dev/null
                echo "host    all             postgres        127.0.0.1/32            md5" | sudo tee -a "$PG_HBA" >/dev/null
                echo "host    all             postgres        ::1/128                 md5" | sudo tee -a "$PG_HBA" >/dev/null
                
                # Reload PostgreSQL
                echo -e "${YELLOW}  Reloading PostgreSQL...${NC}"
                sudo systemctl reload postgresql 2>/dev/null || sudo service postgresql reload 2>/dev/null
                sleep 2
            fi
        fi
        
        # Test connection again
        if test_db_connection "postgres"; then
            echo -e "${GREEN}✅ PostgreSQL authentication fixed!${NC}\n"
            return 0
        fi
    else
        echo -e "${YELLOW}  Sudo access required for auto-fix. Skipping...${NC}"
    fi
    
    return 1
}

# Check if PostgreSQL is running and accessible
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found. Make sure PostgreSQL is installed and running.${NC}"
else
    # Get password from .env
    if [ -f backend/.env ]; then
        DB_PASSWORD=$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -z "$DB_PASSWORD" ]; then
            DB_PASSWORD="postgres"
        fi
    else
        DB_PASSWORD="postgres"
    fi
    
    if pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
        
        # Test database connection
        if test_db_connection "$DB_PASSWORD"; then
            echo -e "${GREEN}✅ Database connection successful${NC}\n"
        else
            echo -e "${YELLOW}⚠️  Database connection failed. Attempting to fix...${NC}"
            if auto_fix_postgres; then
                echo -e "${GREEN}✅ Database connection now working${NC}\n"
            else
                echo -e "${YELLOW}⚠️  Could not auto-fix. Backend will attempt connection.${NC}"
                echo -e "${YELLOW}   If backend fails, run: ${NC}sudo ./setup-postgres.sh${NC}\n"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  PostgreSQL doesn't seem to be running. Attempting to start...${NC}"
        
        # Try to start PostgreSQL (requires sudo)
        if sudo -n true 2>/dev/null; then
            echo -e "${YELLOW}  Starting PostgreSQL service...${NC}"
            if sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null; then
                sleep 3
                # Wait a bit more and check again
                for i in {1..5}; do
                    if pg_isready -U postgres >/dev/null 2>&1; then
                        echo -e "${GREEN}✅ PostgreSQL started successfully${NC}"
                        
                        # Ensure database exists
                        echo -e "${YELLOW}  Ensuring database exists...${NC}"
                        sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='ecom_db'" | grep -q 1 || \
                            sudo -u postgres psql -c "CREATE DATABASE ecom_db;" >/dev/null 2>&1
                        
                        # Test database connection
                        if test_db_connection "$DB_PASSWORD"; then
                            echo -e "${GREEN}✅ Database connection successful${NC}\n"
                            break
                        else
                            echo -e "${YELLOW}⚠️  Database connection failed. Attempting to fix...${NC}"
                            if auto_fix_postgres; then
                                echo -e "${GREEN}✅ Database connection now working${NC}\n"
                                break
                            fi
                        fi
                        break
                    fi
                    sleep 1
                done
                
                if ! pg_isready -U postgres >/dev/null 2>&1; then
                    echo -e "${RED}❌ PostgreSQL failed to start or is not ready${NC}"
                    echo -e "${YELLOW}   Try manually: ${NC}sudo systemctl start postgresql${NC}"
                    echo -e "${YELLOW}   Check status: ${NC}sudo systemctl status postgresql${NC}"
                    echo -e "${YELLOW}   Or run: ${NC}sudo ./setup-postgres.sh${NC} for full setup\n"
                    echo -e "${RED}Exiting - PostgreSQL must be running for the backend to start.${NC}\n"
                    exit 1
                fi
            else
                echo -e "${RED}❌ Could not start PostgreSQL service${NC}"
                echo -e "${YELLOW}   Try manually: ${NC}sudo systemctl start postgresql${NC}"
                echo -e "${YELLOW}   Or run: ${NC}sudo ./setup-postgres.sh${NC} for full setup\n"
                echo -e "${RED}Exiting - PostgreSQL must be running for the backend to start.${NC}\n"
                exit 1
            fi
        else
            echo -e "${YELLOW}⚠️  Sudo access required to start PostgreSQL${NC}"
            echo -e "${YELLOW}   Attempting to start with password prompt...${NC}"
            
            # Try to start PostgreSQL with sudo (will prompt for password)
            if sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null; then
                sleep 3
                # Wait a bit more and check again
                for i in {1..5}; do
                    if pg_isready -U postgres >/dev/null 2>&1; then
                        echo -e "${GREEN}✅ PostgreSQL started successfully${NC}"
                        
                        # Ensure database exists
                        echo -e "${YELLOW}  Ensuring database exists...${NC}"
                        sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='ecom_db'" | grep -q 1 || \
                            sudo -u postgres psql -c "CREATE DATABASE ecom_db;" >/dev/null 2>&1
                        
                        # Test database connection
                        if test_db_connection "$DB_PASSWORD"; then
                            echo -e "${GREEN}✅ Database connection successful${NC}\n"
                            break
                        else
                            echo -e "${YELLOW}⚠️  Database connection failed. Attempting to fix...${NC}"
                            if auto_fix_postgres; then
                                echo -e "${GREEN}✅ Database connection now working${NC}\n"
                                break
                            fi
                        fi
                        break
                    fi
                    sleep 1
                done
                
                if ! pg_isready -U postgres >/dev/null 2>&1; then
                    echo -e "${RED}❌ PostgreSQL failed to start or is not ready${NC}"
                    echo -e "${YELLOW}   Try manually: ${NC}sudo systemctl start postgresql${NC}"
                    echo -e "${YELLOW}   Check status: ${NC}sudo systemctl status postgresql${NC}"
                    echo -e "${YELLOW}   Or run: ${NC}sudo ./setup-postgres.sh${NC} for full setup\n"
                    echo -e "${RED}Exiting - PostgreSQL must be running for the backend to start.${NC}\n"
                    exit 1
                fi
            else
                echo -e "${RED}❌ Failed to start PostgreSQL (sudo password may be required)${NC}"
                echo -e "\n${YELLOW}To fix this, run one of the following:${NC}"
                echo -e "  1. ${GREEN}sudo systemctl start postgresql${NC} (then run ./dev.sh again)"
                echo -e "  2. ${GREEN}sudo ./setup-postgres.sh${NC} (full automated setup)"
                echo -e "  3. ${GREEN}sudo ./dev.sh${NC} (run dev.sh with sudo to auto-start PostgreSQL)\n"
                echo -e "${RED}Exiting - PostgreSQL must be running for the backend to start.${NC}\n"
                exit 1
            fi
        fi
    fi
fi

# Start Backend
echo -e "${GREEN}📦 Starting Go Backend...${NC}"
cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file. Please update it with your database credentials.${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example not found. Creating default .env file...${NC}"
        cat > .env << 'ENVEOF'
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ecom_db
DB_PORT=5433
JWT_SECRET=your-secret-key-change-this-in-production
PORT=10000
ENVEOF
        echo -e "${GREEN}✅ Created default .env file. Please update it with your database credentials.${NC}"
    fi
fi

# Install Go dependencies if needed
if [ ! -f "go.sum" ]; then
    echo -e "${BLUE}📥 Installing Go dependencies...${NC}"
    go mod tidy
fi

# Start backend in background
go run main.go &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Wait a bit more and check if backend started successfully
sleep 2
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start.${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "  • PostgreSQL authentication failed"
    echo -e "  • Database 'ecom_db' doesn't exist"
    echo -e "  • Wrong credentials in backend/.env"
    echo -e "\n${YELLOW}Try running:${NC}"
    echo -e "  ${GREEN}sudo ./setup-postgres.sh${NC} - Full automated setup"
    echo -e "  ${GREEN}./verify-password.sh${NC} - Verify and fix password"
    echo -e "  ${GREEN}sudo ./fix-pg-auth.sh${NC} - Fix authentication config\n"
    exit 1
fi

echo -e "${GREEN}✅ Backend running on http://localhost:10000 (PID: $BACKEND_PID)${NC}\n"

# Wait a bit for backend to stabilize
sleep 2

# Start Frontend
echo -e "${GREEN}🎨 Starting Next.js Frontend...${NC}"
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📥 Installing Node.js dependencies...${NC}"
    # Use local npm cache to avoid permission issues
    npm install --legacy-peer-deps --cache ./.npm-cache 2>/dev/null || npm install --legacy-peer-deps
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from .env.local.example...${NC}"
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✅ Created .env.local file.${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.local.example not found. Creating default .env.local file...${NC}"
        echo "NEXT_PUBLIC_API_URL=http://localhost:10000/api" > .env.local
        echo -e "${GREEN}✅ Created default .env.local file.${NC}"
    fi
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start. Check the logs above.${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Frontend running on http://localhost:10001 (PID: $FRONTEND_PID)${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Development servers are running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Backend:  ${NC}http://localhost:10000"
echo -e "${GREEN}Frontend: ${NC}http://localhost:10001"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}\n"

# Wait for both processes
wait

