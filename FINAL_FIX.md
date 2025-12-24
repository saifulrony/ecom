# Final Fix for PostgreSQL Authentication

## The Problem
Password authentication is failing even though password was set.

## Solution Steps

### Step 1: Verify and Reset Password
```bash
./verify-password.sh
```

This will:
- Check the password in your .env file
- Test the connection
- Reset the password if needed
- Restart PostgreSQL

### Step 2: If Still Failing - Fix pg_hba.conf
```bash
sudo ./fix-pg-auth.sh
```

This will:
- Update PostgreSQL authentication configuration
- Enable password authentication for TCP/IP connections
- Reload PostgreSQL

### Step 3: Start the App
```bash
./dev.sh
```

## Alternative: Manual Password Reset

If scripts don't work, do it manually:

```bash
# 1. Connect as postgres user
sudo -u postgres psql

# 2. Set password
ALTER USER postgres PASSWORD 'postgres';

# 3. Exit
\q

# 4. Restart PostgreSQL
sudo systemctl restart postgresql

# 5. Test
PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;"
```

## Quick Test Command

Test if password works:
```bash
PGPASSWORD=postgres psql -U postgres -d ecom_db -h 127.0.0.1 -c "SELECT 1;"
```

If this works, then `./dev.sh` should work too!

