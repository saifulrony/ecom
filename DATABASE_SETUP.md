# Database Setup Guide

## Quick Fix for PostgreSQL Connection Issues

### Step 1: Start PostgreSQL

```bash
# Try one of these commands:
sudo systemctl start postgresql
# OR
sudo service postgresql start
# OR
sudo /etc/init.d/postgresql start
```

### Step 2: Check if it's running

```bash
sudo systemctl status postgresql
# OR
pg_isready -U postgres
```

### Step 3: Create Database

```bash
# Option 1: Using sudo (if you have sudo access)
sudo -u postgres psql -c "CREATE DATABASE ecom_db;"

# Option 2: Switch to postgres user
sudo su - postgres
psql -c "CREATE DATABASE ecom_db;"
exit
```

### Step 4: Set Password (if needed)

If your PostgreSQL password is not "postgres", you have two options:

**Option A: Set PostgreSQL password to "postgres"**
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

**Option B: Update backend/.env with your actual password**
```bash
# Edit backend/.env and change:
DB_PASSWORD=your_actual_password
```

### Step 5: Test Connection

```bash
# Test with default password
PGPASSWORD=postgres psql -U postgres -d ecom_db -c "SELECT 1;"

# If that works, you're good to go!
```

### Step 6: Run the Application

```bash
./dev.sh
```

## Troubleshooting

### "PostgreSQL is not running"
- Start it: `sudo systemctl start postgresql`
- Enable auto-start: `sudo systemctl enable postgresql`

### "Password authentication failed"
- Run: `./fix-db.sh` for diagnostic help
- Or set password: `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"`

### "Database does not exist"
- Create it: `sudo -u postgres psql -c "CREATE DATABASE ecom_db;"`

### "Permission denied"
- Make sure you have sudo access
- Or switch to postgres user: `sudo su - postgres`

## Quick Setup Script

Run this helper script:
```bash
./fix-db.sh
```

It will:
- Check if PostgreSQL is running
- Create the database if needed
- Test the connection
- Provide specific instructions if something is wrong

