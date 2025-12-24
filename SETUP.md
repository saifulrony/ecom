# Quick Setup Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Go 1.21+ installed (`go version`)
- ✅ Node.js 18+ installed (`node --version`)
- ✅ PostgreSQL installed and running
- ✅ npm or yarn installed

## Quick Start (5 minutes)

### Option 1: Use Development Script (Easiest)

```bash
# Make script executable (first time only)
chmod +x dev.sh

# Run both servers
./dev.sh
```

That's it! The script handles everything automatically. Press `Ctrl+C` to stop.

### Option 2: Manual Setup

### Step 1: Database Setup

```bash
# Start PostgreSQL (if not running)
# On macOS with Homebrew:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE ecom_db;
\q
```

### Step 2: Backend Setup

```bash
cd backend

# Install Go dependencies
go mod download

# Update .env with your database password if different
# The default assumes: user=postgres, password=postgres

# Run backend (will auto-create tables and seed data)
go run main.go
```

Backend should be running on `http://localhost:10000`

### Step 3: Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend should be running on `http://localhost:10001`

### Step 4: Test the Application

1. Open `http://localhost:10001` in your browser
2. Click "Sign Up" to create an account
3. Browse products and add items to cart
4. Complete checkout

## Troubleshooting

### Backend Issues

**Error: "Failed to connect to database"**
- Check PostgreSQL is running: `psql -U postgres -c "SELECT 1;"`
- Verify credentials in `backend/.env`
- Ensure database exists: `CREATE DATABASE ecom_db;`

**Error: "Port 10000 already in use"**
- Change PORT in `backend/.env` to another port (e.g., 8081)
- Update `frontend/.env.local` with new API URL

### Frontend Issues

**Error: "Cannot connect to API"**
- Verify backend is running on port 10000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check browser console for CORS errors

**Error: "Module not found"**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## Default Credentials

After seeding, you can register a new account or use:
- Email: (register new account)
- Password: (minimum 6 characters)

## API Testing

Test the API directly:

```bash
# Health check
curl http://localhost:10000/health

# Register user
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Get products
curl http://localhost:10000/api/products
```

## Next Steps

- Customize product images (update URLs in database)
- Add payment gateway integration
- Deploy to production
- Add more features from the README

Happy coding! 🚀

