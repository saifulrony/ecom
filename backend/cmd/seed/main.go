package main

import (
	"fmt"
	"log"

	"ecom-backend/config"
	"ecom-backend/database"
	"ecom-backend/models"
)

func main() {
	// Load configuration (needed to initialize config for database connection)
	config.LoadConfig()

	// Connect to database
	database.Connect()

	// Clear existing products and categories
	log.Println("Clearing existing products and categories...")
	database.DB.Exec("DELETE FROM products")
	database.DB.Exec("DELETE FROM categories")

	// Seed categories
	categories := []models.Category{
		{Name: "Electronics", Slug: "electronics"},
		{Name: "Clothing", Slug: "clothing"},
		{Name: "Books", Slug: "books"},
		{Name: "Home & Garden", Slug: "home-garden"},
		{Name: "Sports", Slug: "sports"},
	}

	for _, category := range categories {
		database.DB.Create(&category)
	}

	// Get category references
	var electronicsCategory, clothingCategory, booksCategory, homeGardenCategory, sportsCategory models.Category
	database.DB.Where("slug = ?", "electronics").First(&electronicsCategory)
	database.DB.Where("slug = ?", "clothing").First(&clothingCategory)
	database.DB.Where("slug = ?", "books").First(&booksCategory)
	database.DB.Where("slug = ?", "home-garden").First(&homeGardenCategory)
	database.DB.Where("slug = ?", "sports").First(&sportsCategory)

	// Seed products
	products := []models.Product{
		// Electronics (6)
		{Name: "Wireless Bluetooth Headphones", Description: "Premium noise-cancelling wireless headphones with 30-hour battery life", Price: 3500.00, Image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", Stock: 50, CategoryID: electronicsCategory.ID},
		{Name: "Smart Watch Pro", Description: "Feature-rich smartwatch with fitness tracking and notifications", Price: 8500.00, Image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500", Stock: 30, CategoryID: electronicsCategory.ID},
		{Name: "USB-C Laptop Stand", Description: "Ergonomic aluminum laptop stand for better posture", Price: 2500.00, Image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500", Stock: 100, CategoryID: electronicsCategory.ID},
		{Name: "Wireless Mouse", Description: "Ergonomic wireless mouse with long battery life", Price: 1200.00, Image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500", Stock: 80, CategoryID: electronicsCategory.ID},
		{Name: "Portable Power Bank", Description: "20000mAh fast charging power bank", Price: 2800.00, Image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c8?w=500", Stock: 60, CategoryID: electronicsCategory.ID},
		{Name: "Bluetooth Speaker", Description: "Waterproof portable Bluetooth speaker", Price: 3200.00, Image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500", Stock: 45, CategoryID: electronicsCategory.ID},
		// Clothing (6)
		{Name: "Premium Cotton T-Shirt", Description: "Comfortable 100% organic cotton t-shirt", Price: 899.00, Image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500", Stock: 200, CategoryID: clothingCategory.ID},
		{Name: "Classic Denim Jeans", Description: "Classic fit denim jeans with stretch comfort", Price: 2200.00, Image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500", Stock: 75, CategoryID: clothingCategory.ID},
		{Name: "Running Sports Shoes", Description: "Lightweight running shoes with cushioned sole", Price: 4500.00, Image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500", Stock: 60, CategoryID: clothingCategory.ID},
		{Name: "Casual Hoodie", Description: "Warm and comfortable hoodie", Price: 1800.00, Image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500", Stock: 90, CategoryID: clothingCategory.ID},
		{Name: "Formal Dress Shirt", Description: "Professional long-sleeve dress shirt", Price: 1500.00, Image: "https://images.unsplash.com/photo-1594938291221-94ad1b724ece?w=500", Stock: 55, CategoryID: clothingCategory.ID},
		{Name: "Summer Shorts", Description: "Comfortable and stylish shorts", Price: 1200.00, Image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500", Stock: 110, CategoryID: clothingCategory.ID},
		// Books (3)
		{Name: "The Complete Programming Guide", Description: "Comprehensive guide to modern programming", Price: 850.00, Image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500", Stock: 40, CategoryID: booksCategory.ID},
		{Name: "Web Development Handbook", Description: "Essential handbook for web developers", Price: 950.00, Image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500", Stock: 35, CategoryID: booksCategory.ID},
		{Name: "Business Strategy Book", Description: "Insights into modern business strategies", Price: 750.00, Image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500", Stock: 50, CategoryID: booksCategory.ID},
		// Home & Garden (4)
		{Name: "Indoor Plant Pot Set", Description: "Beautiful ceramic plant pot set", Price: 1800.00, Image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500", Stock: 70, CategoryID: homeGardenCategory.ID},
		{Name: "LED Desk Lamp", Description: "Modern LED desk lamp with adjustable brightness", Price: 1500.00, Image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500", Stock: 65, CategoryID: homeGardenCategory.ID},
		{Name: "Kitchen Knife Set", Description: "Professional stainless steel knife set", Price: 3500.00, Image: "https://images.unsplash.com/photo-1594736797933-d0a69e3c6288?w=500", Stock: 40, CategoryID: homeGardenCategory.ID},
		{Name: "Coffee Maker Machine", Description: "Automatic coffee maker with timer", Price: 5200.00, Image: "https://images.unsplash.com/photo-1517668808823-f8c02e6c3e92?w=500", Stock: 25, CategoryID: homeGardenCategory.ID},
		// Sports (4)
		{Name: "Yoga Mat Premium", Description: "Non-slip yoga mat with extra cushioning", Price: 2500.00, Image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500", Stock: 80, CategoryID: sportsCategory.ID},
		{Name: "Dumbbell Set 10kg", Description: "Adjustable dumbbell set for home workouts", Price: 4200.00, Image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500", Stock: 35, CategoryID: sportsCategory.ID},
		{Name: "Basketball Official Size", Description: "High-quality basketball", Price: 1800.00, Image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500", Stock: 50, CategoryID: sportsCategory.ID},
		{Name: "Fitness Resistance Bands", Description: "Set of 5 resistance bands", Price: 1200.00, Image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=500", Stock: 90, CategoryID: sportsCategory.ID},
	}

	for _, product := range products {
		database.DB.Create(&product)
	}

	fmt.Printf("✅ Successfully seeded %d products!\n", len(products))
}

