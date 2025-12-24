package main

import (
	"fmt"
	"log"

	"ecom-backend/cache"
	"ecom-backend/config"
	"ecom-backend/database"
	"ecom-backend/routes"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database
	database.Connect()

	// Connect to Redis
	cache.Connect(cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword)

	// Run migrations
	database.Migrate()

	// Seed initial data
	database.SeedData()

	// Setup routes
	r := routes.SetupRoutes()

	// Start server
	port := cfg.Port
	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(fmt.Sprintf(":%s", port)))
}

