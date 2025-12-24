package database

import (
	"fmt"
	"log"

	"ecom-backend/config"
	"ecom-backend/models"
	"ecom-backend/utils"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	cfg := config.LoadConfig()

	var dsn string
	var err error
	
	// Try multiple connection methods for postgres user
	if cfg.DBHost == "localhost" && cfg.DBUser == "postgres" {
		// Attempt 1: Unix socket with port 5433 (where the socket actually is)
		dsn = fmt.Sprintf(
			"host=/var/run/postgresql user=%s dbname=%s port=5433 sslmode=disable TimeZone=UTC",
			cfg.DBUser,
			cfg.DBName,
		)
		log.Println("Attempting Unix socket connection (port 5433)...")
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		
		if err != nil {
			// Attempt 2: TCP/IP with port 5433
			log.Println("Unix socket failed, trying TCP/IP on port 5433...")
			dsn = fmt.Sprintf(
				"host=127.0.0.1 user=%s password=%s dbname=%s port=5433 sslmode=disable TimeZone=UTC",
				cfg.DBUser,
				cfg.DBPassword,
				cfg.DBName,
			)
			DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
			
			if err != nil {
				// Attempt 3: TCP/IP with configured port (usually 5432)
				log.Println("Port 5433 failed, trying TCP/IP on configured port...")
				dsn = fmt.Sprintf(
					"host=127.0.0.1 user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
					cfg.DBUser,
					cfg.DBPassword,
					cfg.DBName,
					cfg.DBPort,
				)
				DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
			}
		}
	} else {
		// Use TCP/IP with password for other cases
		host := cfg.DBHost
		if host == "localhost" {
			host = "127.0.0.1"
		}
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			host,
			cfg.DBUser,
			cfg.DBPassword,
			cfg.DBName,
			cfg.DBPort,
		)
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	}

	if err != nil {
		log.Printf("Database connection failed. DSN: %s", dsn)
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")
}

func Migrate() {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.Cart{},
		&models.Order{},
		&models.OrderItem{},
		&models.Payment{},
		&models.Coupon{},
		&models.Setting{},
		&models.Notification{},
		&models.ProductVariation{},
		&models.VariationOption{},
		&models.Review{},
		&models.ShippingMethod{},
		&models.ShippingAddress{},
		&models.Refund{},
		&models.AuditLog{},
		&models.Wishlist{},
		&models.Campaign{},
		&models.Chat{},
		&models.ChatMessage{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migrated successfully")
}

func SeedData() {
	// Seed admin users first
	seedAdminUsers()

	// Check if products already exist
	var productCount int64
	DB.Model(&models.Product{}).Count(&productCount)
	if productCount > 0 {
		log.Println("Products already exist, skipping seed data")
		return
	}

	// Seed categories
	categories := []models.Category{
		{Name: "Electronics", Slug: "electronics"},
		{Name: "Clothing", Slug: "clothing"},
		{Name: "Books", Slug: "books"},
		{Name: "Home & Garden", Slug: "home-garden"},
		{Name: "Sports", Slug: "sports"},
	}

	// Create categories if they don't exist
	for _, category := range categories {
		var existingCategory models.Category
		if err := DB.Where("slug = ?", category.Slug).First(&existingCategory).Error; err != nil {
			DB.Create(&category)
		}
	}

	// Get category references
	var electronicsCategory models.Category
	DB.Where("slug = ?", "electronics").First(&electronicsCategory)

	var clothingCategory models.Category
	DB.Where("slug = ?", "clothing").First(&clothingCategory)

	var booksCategory models.Category
	DB.Where("slug = ?", "books").First(&booksCategory)

	var homeGardenCategory models.Category
	DB.Where("slug = ?", "home-garden").First(&homeGardenCategory)

	var sportsCategory models.Category
	DB.Where("slug = ?", "sports").First(&sportsCategory)

	// Seed demo products with prices in Taka (৳)
	products := []models.Product{
		// Electronics
		{
			Name:        "Wireless Bluetooth Headphones",
			Description: "Premium noise-cancelling wireless headphones with 30-hour battery life and crystal clear sound",
			Price:       3500.00,
			Image:       "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
			Stock:       50,
			CategoryID:  electronicsCategory.ID,
		},
		{
			Name:        "Smart Watch Pro",
			Description: "Feature-rich smartwatch with fitness tracking, heart rate monitor, and smartphone notifications",
			Price:       8500.00,
			Image:       "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
			Stock:       30,
			CategoryID:  electronicsCategory.ID,
		},
		{
			Name:        "USB-C Laptop Stand",
			Description: "Ergonomic aluminum laptop stand for better posture and improved airflow",
			Price:       2500.00,
			Image:       "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500",
			Stock:       100,
			CategoryID:  electronicsCategory.ID,
		},
		{
			Name:        "Wireless Mouse",
			Description: "Ergonomic wireless mouse with long battery life and precise tracking",
			Price:       1200.00,
			Image:       "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500",
			Stock:       80,
			CategoryID:  electronicsCategory.ID,
		},
		{
			Name:        "Portable Power Bank",
			Description: "20000mAh fast charging power bank with USB-C and wireless charging support",
			Price:       2800.00,
			Image:       "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c8?w=500",
			Stock:       60,
			CategoryID:  electronicsCategory.ID,
		},
		{
			Name:        "Bluetooth Speaker",
			Description: "Waterproof portable Bluetooth speaker with 360-degree sound and 12-hour battery",
			Price:       3200.00,
			Image:       "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500",
			Stock:       45,
			CategoryID:  electronicsCategory.ID,
		},
		// Clothing
		{
			Name:        "Premium Cotton T-Shirt",
			Description: "Comfortable 100% organic cotton t-shirt in various colors - perfect for everyday wear",
			Price:       899.00,
			Image:       "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
			Stock:       200,
			CategoryID:  clothingCategory.ID,
		},
		{
			Name:        "Classic Denim Jeans",
			Description: "Classic fit denim jeans with stretch comfort and modern styling",
			Price:       2200.00,
			Image:       "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500",
			Stock:       75,
			CategoryID:  clothingCategory.ID,
		},
		{
			Name:        "Running Sports Shoes",
			Description: "Lightweight running shoes with cushioned sole and breathable mesh upper",
			Price:       4500.00,
			Image:       "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
			Stock:       60,
			CategoryID:  clothingCategory.ID,
		},
		{
			Name:        "Casual Hoodie",
			Description: "Warm and comfortable hoodie perfect for cool weather and casual outings",
			Price:       1800.00,
			Image:       "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
			Stock:       90,
			CategoryID:  clothingCategory.ID,
		},
		{
			Name:        "Formal Dress Shirt",
			Description: "Professional long-sleeve dress shirt suitable for office and formal occasions",
			Price:       1500.00,
			Image:       "https://images.unsplash.com/photo-1594938291221-94ad1b724ece?w=500",
			Stock:       55,
			CategoryID:  clothingCategory.ID,
		},
		{
			Name:        "Summer Shorts",
			Description: "Comfortable and stylish shorts perfect for hot weather and outdoor activities",
			Price:       1200.00,
			Image:       "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500",
			Stock:       110,
			CategoryID:  clothingCategory.ID,
		},
		// Books
		{
			Name:        "The Complete Programming Guide",
			Description: "Comprehensive guide to modern programming languages and best practices",
			Price:       850.00,
			Image:       "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500",
			Stock:       40,
			CategoryID:  booksCategory.ID,
		},
		{
			Name:        "Web Development Handbook",
			Description: "Essential handbook for web developers covering HTML, CSS, JavaScript, and frameworks",
			Price:       950.00,
			Image:       "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
			Stock:       35,
			CategoryID:  booksCategory.ID,
		},
		{
			Name:        "Business Strategy Book",
			Description: "Insights into modern business strategies and entrepreneurship",
			Price:       750.00,
			Image:       "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500",
			Stock:       50,
			CategoryID:  booksCategory.ID,
		},
		// Home & Garden
		{
			Name:        "Indoor Plant Pot Set",
			Description: "Beautiful ceramic plant pot set perfect for indoor gardening and home decoration",
			Price:       1800.00,
			Image:       "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500",
			Stock:       70,
			CategoryID:  homeGardenCategory.ID,
		},
		{
			Name:        "LED Desk Lamp",
			Description: "Modern LED desk lamp with adjustable brightness and USB charging port",
			Price:       1500.00,
			Image:       "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500",
			Stock:       65,
			CategoryID:  homeGardenCategory.ID,
		},
		{
			Name:        "Kitchen Knife Set",
			Description: "Professional stainless steel knife set with wooden block for your kitchen",
			Price:       3500.00,
			Image:       "https://images.unsplash.com/photo-1594736797933-d0a69e3c6288?w=500",
			Stock:       40,
			CategoryID:  homeGardenCategory.ID,
		},
		{
			Name:        "Coffee Maker Machine",
			Description: "Automatic coffee maker with programmable timer and thermal carafe",
			Price:       5200.00,
			Image:       "https://images.unsplash.com/photo-1517668808823-f8c02e6c3e92?w=500",
			Stock:       25,
			CategoryID:  homeGardenCategory.ID,
		},
		// Sports
		{
			Name:        "Yoga Mat Premium",
			Description: "Non-slip yoga mat with extra cushioning and carrying strap",
			Price:       2500.00,
			Image:       "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500",
			Stock:       80,
			CategoryID:  sportsCategory.ID,
		},
		{
			Name:        "Dumbbell Set 10kg",
			Description: "Adjustable dumbbell set perfect for home workouts and strength training",
			Price:       4200.00,
			Image:       "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500",
			Stock:       35,
			CategoryID:  sportsCategory.ID,
		},
		{
			Name:        "Basketball Official Size",
			Description: "High-quality basketball with excellent grip and durability",
			Price:       1800.00,
			Image:       "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500",
			Stock:       50,
			CategoryID:  sportsCategory.ID,
		},
		{
			Name:        "Fitness Resistance Bands",
			Description: "Set of 5 resistance bands with different resistance levels for full-body workouts",
			Price:       1200.00,
			Image:       "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=500",
			Stock:       90,
			CategoryID:  sportsCategory.ID,
		},
	}

	for _, product := range products {
		DB.Create(&product)
	}

	log.Printf("Seed data created successfully: %d products added", len(products))
}

func seedAdminUsers() {
	// Hash password for admin users
	hashedPassword, err := utils.HashPassword("admin123")
	if err != nil {
		log.Printf("Failed to hash password: %v", err)
		return
	}

	// Create admin users
	adminUsers := []models.User{
		{
			Email:    "admin@ecom.com",
			Password: hashedPassword,
			Name:     "Admin User",
			Role:     "admin",
		},
		{
			Email:    "manager@ecom.com",
			Password: hashedPassword,
			Name:     "Manager User",
			Role:     "manager",
		},
		{
			Email:    "staff@ecom.com",
			Password: hashedPassword,
			Name:     "Staff User",
			Role:     "staff",
		},
	}

	for _, user := range adminUsers {
		var existingUser models.User
		if err := DB.Where("email = ?", user.Email).First(&existingUser).Error; err != nil {
			DB.Create(&user)
			log.Printf("Created %s user: %s", user.Role, user.Email)
		} else {
			// Update password if user exists (in case password changed)
			existingUser.Password = hashedPassword
			DB.Save(&existingUser)
			log.Printf("Updated password for %s user: %s", user.Role, user.Email)
		}
	}

	// Create test customer account
	customerPassword, err := utils.HashPassword("customer123")
	if err != nil {
		log.Printf("Failed to hash customer password: %v", err)
		return
	}

	var customerUser models.User
	if err := DB.Where("email = ?", "customer@ecom.com").First(&customerUser).Error; err != nil {
		customerUser = models.User{
			Email:    "customer@ecom.com",
			Password: customerPassword,
			Name:     "Test Customer",
			Role:     "user",
		}
		DB.Create(&customerUser)
		log.Printf("Created test customer user: %s", customerUser.Email)
	} else {
		// Update password if customer exists
		customerUser.Password = customerPassword
		DB.Save(&customerUser)
		log.Printf("Updated password for test customer: %s", customerUser.Email)
	}
}


