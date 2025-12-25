package controllers

import (
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetTaxRates returns all tax rates (admin only)
func GetTaxRates(c *gin.Context) {
	var taxRates []models.TaxRate
	if err := database.DB.Order("is_default DESC, country ASC, region ASC").Find(&taxRates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tax rates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tax_rates": taxRates})
}

// GetTaxRate returns a specific tax rate (admin only)
func GetTaxRate(c *gin.Context) {
	id := c.Param("id")
	var taxRate models.TaxRate
	if err := database.DB.First(&taxRate, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tax rate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tax_rate": taxRate})
}

// CreateTaxRate creates a new tax rate (admin only)
func CreateTaxRate(c *gin.Context) {
	var req models.TaxRate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If this is set as default, unset other defaults
	if req.IsDefault {
		database.DB.Model(&models.TaxRate{}).Where("is_default = ?", true).Update("is_default", false)
	}

	if err := database.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tax rate"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Tax rate created", "tax_rate": req})
}

// UpdateTaxRate updates a tax rate (admin only)
func UpdateTaxRate(c *gin.Context) {
	id := c.Param("id")
	var taxRate models.TaxRate
	if err := database.DB.First(&taxRate, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tax rate not found"})
		return
	}

	var req models.TaxRate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If this is set as default, unset other defaults
	if req.IsDefault && !taxRate.IsDefault {
		database.DB.Model(&models.TaxRate{}).Where("is_default = ? AND id != ?", true, id).Update("is_default", false)
	}

	taxRate.Country = req.Country
	taxRate.Region = req.Region
	taxRate.City = req.City
	taxRate.Rate = req.Rate
	taxRate.IsDefault = req.IsDefault

	if err := database.DB.Save(&taxRate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tax rate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tax rate updated", "tax_rate": taxRate})
}

// DeleteTaxRate deletes a tax rate (admin only)
func DeleteTaxRate(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.TaxRate{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tax rate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tax rate deleted"})
}

// GetTaxRateForLocation returns tax rate for a specific location (public)
func GetTaxRateForLocation(c *gin.Context) {
	country := c.Query("country")
	region := c.Query("region")
	city := c.Query("city")

	var taxRate models.TaxRate
	query := database.DB

	// Try to find most specific match: city > region > country > default
	if city != "" {
		if err := query.Where("country = ? AND region = ? AND city = ?", country, region, city).First(&taxRate).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{"tax_rate": taxRate})
			return
		}
	}

	if region != "" {
		if err := query.Where("country = ? AND region = ? AND (city = '' OR city IS NULL)", country, region).First(&taxRate).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{"tax_rate": taxRate})
			return
		}
	}

	if country != "" {
		if err := query.Where("country = ? AND (region = '' OR region IS NULL) AND (city = '' OR city IS NULL)", country).First(&taxRate).Error; err == nil {
			c.JSON(http.StatusOK, gin.H{"tax_rate": taxRate})
			return
		}
	}

	// Fallback to default
	if err := query.Where("is_default = ?", true).First(&taxRate).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"tax_rate": taxRate})
		return
	}

	// No tax rate found, return 0
	c.JSON(http.StatusOK, gin.H{"tax_rate": models.TaxRate{Rate: 0}})
}

