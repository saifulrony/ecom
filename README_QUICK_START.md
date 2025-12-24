# Quick Start Guide

## One Command to Run Everything

```bash
./dev.sh
```

That's it! The script will:
1. ✅ Check if PostgreSQL is running
2. ✅ Test database connection
3. ✅ Automatically fix password/database if needed (with sudo)
4. ✅ Install dependencies
5. ✅ Start backend on port 10000
6. ✅ Start frontend on port 10001

## If You Get Authentication Errors

If `./dev.sh` shows authentication errors, run this first:

```bash
sudo ./setup-postgres.sh
```

Then run `./dev.sh` again.

## What You'll See

After running `./dev.sh`, you'll see:
- Backend: http://localhost:10000
- Frontend: http://localhost:10001

Open http://localhost:10001 in your browser!

## Stop the Servers

Press `Ctrl+C` in the terminal, or run:
```bash
./stop.sh
```

## Troubleshooting

### "Need sudo access to fix"
Run: `sudo ./setup-postgres.sh`

### "Password authentication failed"
Run: `sudo ./fix-pg-auth.sh`

### "PostgreSQL not running"
Run: `sudo systemctl start postgresql`

---

**That's all you need!** Just run `./dev.sh` and it handles everything. 🚀

