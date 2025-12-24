#!/bin/bash
echo "Testing PostgreSQL connection methods..."

echo -e "\n1. Testing with PGPASSWORD and localhost:"
PGPASSWORD=postgres psql -U postgres -d ecom_db -h localhost -c "SELECT 1;" 2>&1 | head -2

echo -e "\n2. Testing with connection string:"
PGPASSWORD=postgres psql "postgresql://postgres:postgres@localhost:5432/ecom_db" -c "SELECT 1;" 2>&1 | head -2

echo -e "\n3. Testing Go connection (what the app uses):"
cd backend && go run -exec echo 'package main; import ("fmt"; "database/sql"; _ "github.com/lib/pq"); func main() { db, _ := sql.Open("postgres", "host=localhost user=postgres password=postgres dbname=ecom_db port=5432 sslmode=disable"); defer db.Close(); err := db.Ping(); if err != nil { fmt.Println("Error:", err) } else { fmt.Println("Success!") } }' 2>&1 || echo "Go test skipped (needs proper Go file)"
