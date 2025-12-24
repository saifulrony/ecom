package controllers

import (
	"encoding/json"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetProductVariations returns all variations for a product
func GetProductVariations(c *gin.Context) {
	productID := c.Param("id")
	var variations []models.ProductVariation

	if err := database.DB.Preload("Options").Where("product_id = ?", productID).Find(&variations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch variations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"variations": variations})
}

// CreateProductVariation creates a new variation for a product (admin only)
func CreateProductVariation(c *gin.Context) {
	productID := c.Param("id")
	var req struct {
		Name        string `json:"name" binding:"required"`
		IsRequired  bool   `json:"is_required"`
		AllowCustom bool   `json:"allow_custom"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if product exists
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	variation := models.ProductVariation{
		ProductID:   product.ID,
		Name:        req.Name,
		IsRequired:  req.IsRequired,
		AllowCustom: req.AllowCustom,
	}

	if err := database.DB.Create(&variation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create variation"})
		return
	}

	database.DB.Preload("Options").First(&variation, variation.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Variation created", "variation": variation})
}

// UpdateProductVariation updates a variation (admin only)
func UpdateProductVariation(c *gin.Context) {
	variationID := c.Param("id")
	var variation models.ProductVariation
	if err := database.DB.First(&variation, variationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Variation not found"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		IsRequired  bool   `json:"is_required"`
		AllowCustom bool   `json:"allow_custom"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		variation.Name = req.Name
	}
	variation.IsRequired = req.IsRequired
	variation.AllowCustom = req.AllowCustom

	if err := database.DB.Save(&variation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update variation"})
		return
	}

	database.DB.Preload("Options").First(&variation, variation.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Variation updated", "variation": variation})
}

// DeleteProductVariation deletes a variation (admin only)
func DeleteProductVariation(c *gin.Context) {
	variationID := c.Param("id")
	if err := database.DB.Delete(&models.ProductVariation{}, variationID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete variation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Variation deleted"})
}

// CreateVariationOption creates an option for a variation (admin only)
func CreateVariationOption(c *gin.Context) {
	variationID := c.Param("id")
	var req struct {
		Value         string  `json:"value" binding:"required"`
		PriceModifier float64 `json:"price_modifier"`
		Stock         int     `json:"stock"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if variation exists
	var variation models.ProductVariation
	if err := database.DB.First(&variation, variationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Variation not found"})
		return
	}

	option := models.VariationOption{
		VariationID:   variation.ID,
		Value:         req.Value,
		PriceModifier: req.PriceModifier,
		Stock:         req.Stock,
	}

	if err := database.DB.Create(&option).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create option"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Option created", "option": option})
}

// UpdateVariationOption updates an option (admin only)
func UpdateVariationOption(c *gin.Context) {
	optionID := c.Param("option_id")
	var option models.VariationOption
	if err := database.DB.First(&option, optionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Option not found"})
		return
	}

	var req struct {
		Value         string  `json:"value"`
		PriceModifier float64 `json:"price_modifier"`
		Stock         int     `json:"stock"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Value != "" {
		option.Value = req.Value
	}
	option.PriceModifier = req.PriceModifier
	option.Stock = req.Stock

	if err := database.DB.Save(&option).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update option"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Option updated", "option": option})
}

// DeleteVariationOption deletes an option (admin only)
func DeleteVariationOption(c *gin.Context) {
	optionID := c.Param("option_id")
	if err := database.DB.Delete(&models.VariationOption{}, optionID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete option"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Option deleted"})
}

// Helper function to parse variations JSON
func ParseVariations(variationsStr string) map[string]string {
	var variations map[string]string
	if variationsStr != "" {
		json.Unmarshal([]byte(variationsStr), &variations)
	}
	if variations == nil {
		variations = make(map[string]string)
	}
	return variations
}

// Helper function to serialize variations to JSON
func SerializeVariations(variations map[string]string) string {
	if len(variations) == 0 {
		return ""
	}
	data, _ := json.Marshal(variations)
	return string(data)
}

