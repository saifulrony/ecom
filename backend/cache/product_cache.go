package cache

import (
	"encoding/json"
	"fmt"
	"time"

	"ecom-backend/models"
)

const (
	// Cache key prefixes
	ProductCachePrefix    = "product:"
	ProductsListCacheKey  = "products:list:"
	CategoryCachePrefix   = "category:"
	CategoriesListCacheKey = "categories:list"
	DashboardStatsCacheKey = "dashboard:stats"
)

// Cache durations
const (
	ProductCacheDuration    = 15 * time.Minute
	ProductsListCacheDuration = 10 * time.Minute
	CategoryCacheDuration   = 30 * time.Minute
	DashboardStatsDuration  = 5 * time.Minute
)

// GetProduct retrieves a product from cache
func GetProduct(id uint) (*models.Product, error) {
	key := ProductCachePrefix + fmt.Sprintf("%d", id)
	data, err := Get(key)
	if err != nil {
		return nil, err
	}

	var product models.Product
	if err := json.Unmarshal([]byte(data), &product); err != nil {
		return nil, err
	}
	return &product, nil
}

// SetProduct stores a product in cache
func SetProduct(product *models.Product) error {
	key := ProductCachePrefix + fmt.Sprintf("%d", product.ID)
	data, err := json.Marshal(product)
	if err != nil {
		return err
	}
	return Set(key, string(data), ProductCacheDuration)
}

// GetProductsList retrieves products list from cache
func GetProductsList(cacheKey string) ([]models.Product, error) {
	key := ProductsListCacheKey + cacheKey
	data, err := Get(key)
	if err != nil {
		return nil, err
	}

	var products []models.Product
	if err := json.Unmarshal([]byte(data), &products); err != nil {
		return nil, err
	}
	return products, nil
}

// SetProductsList stores products list in cache
func SetProductsList(cacheKey string, products []models.Product) error {
	key := ProductsListCacheKey + cacheKey
	data, err := json.Marshal(products)
	if err != nil {
		return err
	}
	return Set(key, string(data), ProductsListCacheDuration)
}

// InvalidateProduct removes product from cache
func InvalidateProduct(id uint) error {
	// Delete specific product
	key := ProductCachePrefix + fmt.Sprintf("%d", id)
	if err := Delete(key); err != nil {
		return err
	}
	
	// Invalidate all product lists (they may contain this product)
	return DeletePattern(ProductsListCacheKey + "*")
}

// InvalidateAllProducts removes all product caches
func InvalidateAllProducts() error {
	if err := DeletePattern(ProductCachePrefix + "*"); err != nil {
		return err
	}
	return DeletePattern(ProductsListCacheKey + "*")
}

// GetCategory retrieves a category from cache
func GetCategory(id uint) (*models.Category, error) {
	key := CategoryCachePrefix + fmt.Sprintf("%d", id)
	data, err := Get(key)
	if err != nil {
		return nil, err
	}

	var category models.Category
	if err := json.Unmarshal([]byte(data), &category); err != nil {
		return nil, err
	}
	return &category, nil
}

// SetCategory stores a category in cache
func SetCategory(category *models.Category) error {
	key := CategoryCachePrefix + fmt.Sprintf("%d", category.ID)
	data, err := json.Marshal(category)
	if err != nil {
		return err
	}
	return Set(key, string(data), CategoryCacheDuration)
}

// GetCategoriesList retrieves categories list from cache
func GetCategoriesList() ([]models.Category, error) {
	data, err := Get(CategoriesListCacheKey)
	if err != nil {
		return nil, err
	}

	var categories []models.Category
	if err := json.Unmarshal([]byte(data), &categories); err != nil {
		return nil, err
	}
	return categories, nil
}

// SetCategoriesList stores categories list in cache
func SetCategoriesList(categories []models.Category) error {
	data, err := json.Marshal(categories)
	if err != nil {
		return err
	}
	return Set(CategoriesListCacheKey, string(data), CategoryCacheDuration)
}

// InvalidateCategory removes category from cache
func InvalidateCategory(id uint) error {
	// Delete specific category
	key := CategoryCachePrefix + fmt.Sprintf("%d", id)
	if err := Delete(key); err != nil {
		return err
	}
	
	// Invalidate categories list
	return Delete(CategoriesListCacheKey)
}

// InvalidateAllCategories removes all category caches
func InvalidateAllCategories() error {
	if err := DeletePattern(CategoryCachePrefix + "*"); err != nil {
		return err
	}
	return Delete(CategoriesListCacheKey)
}

