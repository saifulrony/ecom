package controllers

import (
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// AdjustStock adjusts product stock (admin only)
func AdjustStock(c *gin.Context) {
	productID := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var req struct {
		Quantity int    `json:"quantity" binding:"required"`
		Reason   string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Adjust stock
	newStock := product.Stock + req.Quantity
	if newStock < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stock cannot be negative"})
		return
	}

	product.Stock = newStock
	if err := database.DB.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to adjust stock"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Stock adjusted successfully",
		"product":     product,
		"old_stock":   product.Stock - req.Quantity,
		"new_stock":   product.Stock,
		"adjustment":  req.Quantity,
		"reason":      req.Reason,
	})
}

