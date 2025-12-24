# Quick Fix for PostgreSQL Authentication Error

## The Problem
You're seeing: `password authentication failed for user "postgres"`

## The Solution (Choose One)

### Option 1: Automated Setup (Easiest) ⭐
```bash
sudo ./setup-postgres.sh
```

This will:
- Start PostgreSQL if not running
- Set password to 'postgres'
- Create the database
- Test the connection

### Option 2: Manual Setup
```bash
# 1. Start PostgreSQL
sudo systemctl start postgresql

# 2. Set password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# 3. Create database
sudo -u postgres psql -c "CREATE DATABASE ecom_db;"

# 4. Test
PGPASSWORD=postgres psql -U postgres -d ecom_db -c "SELECT 1;"
```

### Option 3: Update .env with Your Password
If your PostgreSQL already has a different password:

1. Edit `backend/.env`
2. Change: `DB_PASSWORD=your_actual_password`
3. Save and run `./dev.sh` again

## After Setup
```bash
./dev.sh
```

That's it! 🚀
