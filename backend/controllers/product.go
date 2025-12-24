package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"ecom-backend/cache"
	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

func GetProducts(c *gin.Context) {
	// Build cache key from query parameters
	cacheKey := buildProductsCacheKey(c)

	// Try to get from cache first (only if no search/filters that change frequently)
	// We cache only simple listings without complex filters
	if cacheKey != "" {
		if cachedProducts, err := cache.GetProductsList(cacheKey); err == nil {
			c.JSON(http.StatusOK, gin.H{"products": cachedProducts})
			return
		}
	}

	// Not in cache or cache key indicates no cache, fetch from database
	var products []models.Product
	query := database.DB.Preload("Category")

	// Filter by category
	if categoryID := c.Query("category_id"); categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	// Advanced search - by name, description, or SKU
	if search := c.Query("search"); search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ? OR sku ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filter by price range
	if minPrice := c.Query("min_price"); minPrice != "" {
		query = query.Where("price >= ?", minPrice)
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		query = query.Where("price <= ?", maxPrice)
	}

	// Filter by stock status
	if inStock := c.Query("in_stock"); inStock == "true" {
		query = query.Where("stock > 0")
	} else if inStock == "false" {
		query = query.Where("stock = 0")
	}

	// Sort options
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	if sortOrder == "asc" {
		query = query.Order(sortBy + " ASC")
	} else {
		query = query.Order(sortBy + " DESC")
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Product{}).Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	// Cache simple listings (without search, filters, pagination)
	if cacheKey != "" && c.Query("search") == "" && c.Query("min_price") == "" && c.Query("max_price") == "" && page == 1 {
		cache.SetProductsList(cacheKey, products)
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (int(total) + limit - 1) / limit,
		},
	})
}

// buildProductsCacheKey creates a cache key from query parameters
func buildProductsCacheKey(c *gin.Context) string {
	// Only cache simple queries (category filter + default sort, first page)
	if c.Query("search") != "" || c.Query("min_price") != "" || c.Query("max_price") != "" || c.DefaultQuery("page", "1") != "1" {
		return "" // Don't cache complex queries
	}

	var keyParts []string
	if categoryID := c.Query("category_id"); categoryID != "" {
		keyParts = append(keyParts, "cat:"+categoryID)
	}
	if inStock := c.Query("in_stock"); inStock != "" {
		keyParts = append(keyParts, "stock:"+inStock)
	}
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	keyParts = append(keyParts, "sort:"+sortBy+":"+sortOrder)

	if len(keyParts) == 0 {
		return "default"
	}
	return strings.Join(keyParts, ":")
}

func GetProduct(c *gin.Context) {
	id := c.Param("id")
	productID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	// Try to get from cache first
	if cachedProduct, err := cache.GetProduct(uint(productID)); err == nil {
		// Load variations from DB (cache might be stale for variations)
		database.DB.Preload("Variations").Preload("Variations.Options").First(cachedProduct, id)
		c.JSON(http.StatusOK, cachedProduct)
		return
	}

	// Not in cache, fetch from database
	var product models.Product
	if err := database.DB.Preload("Category").Preload("Variations").Preload("Variations.Options").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Store in cache for future requests
	cache.SetProduct(&product)

	c.JSON(http.StatusOK, product)
}

func GetCategories(c *gin.Context) {
	// Try to get from cache first
	if cachedCategories, err := cache.GetCategoriesList(); err == nil {
		c.JSON(http.StatusOK, cachedCategories)
		return
	}

	// Not in cache, fetch from database
	var categories []models.Category
	if err := database.DB.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	// Store in cache
	cache.SetCategoriesList(categories)

	c.JSON(http.StatusOK, categories)
}

