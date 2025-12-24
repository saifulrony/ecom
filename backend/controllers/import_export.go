package controllers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// ExportProductsCSV exports products to CSV (admin only)
func ExportProductsCSV(c *gin.Context) {
	var products []models.Product
	query := database.DB.Preload("Category")

	// Filters
	if categoryID := c.Query("category_id"); categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	if err := query.Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=products_export.csv")
	c.Status(http.StatusOK)

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write header
	if err := writer.Write([]string{
		"ID", "Name", "Description", "Price", "SKU", "Stock", "Category", "Image",
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV header"})
		return
	}

	// Write data
	for _, product := range products {
		if err := writer.Write([]string{
			strconv.Itoa(int(product.ID)),
			product.Name,
			product.Description,
			fmt.Sprintf("%.2f", product.Price),
			product.SKU,
			strconv.Itoa(product.Stock),
			product.Category.Name,
			product.Image,
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV data"})
			return
		}
	}
}

// ImportProductsCSV imports products from CSV (admin only)
func ImportProductsCSV(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Read CSV file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	reader := csv.NewReader(src)
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse CSV"})
		return
	}

	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV file must have at least a header row"})
		return
	}

	var imported int
	var errors []string

	// Skip header row
	for i := 1; i < len(records); i++ {
		record := records[i]
		if len(record) < 6 {
			errors = append(errors, fmt.Sprintf("Row %d: insufficient columns", i+1))
			continue
		}

		price, _ := strconv.ParseFloat(record[3], 64)
		stock, _ := strconv.Atoi(record[5])

		// Find or create category
		var category models.Category
		if err := database.DB.Where("name = ?", record[6]).First(&category).Error; err != nil {
			// Create category
			category = models.Category{
				Name: record[6],
				Slug: strings.ToLower(strings.ReplaceAll(record[6], " ", "-")),
			}
			database.DB.Create(&category)
		}

		product := models.Product{
			Name:        record[1],
			Description: record[2],
			Price:       price,
			SKU:         record[4],
			Stock:       stock,
			CategoryID:  category.ID,
			Image:       record[7],
		}

		if err := database.DB.Create(&product).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: %s", i+1, err.Error()))
			continue
		}

		imported++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      fmt.Sprintf("Imported %d products", imported),
		"imported":     imported,
		"errors":       errors,
		"total_rows":   len(records) - 1,
	})
}

