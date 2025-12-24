package controllers

import (
	"fmt"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// BulkDeleteProducts deletes multiple products (admin only)
func BulkDeleteProducts(c *gin.Context) {
	var req struct {
		IDs []uint `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Delete(&models.Product{}, req.IDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d products deleted", len(req.IDs))})
}

// BulkUpdateProductStatus updates status for multiple products (admin only)
func BulkUpdateProductStatus(c *gin.Context) {
	var req struct {
		IDs    []uint `json:"ids" binding:"required"`
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stockValue := 0
	if req.Status == "active" {
		stockValue = 1
	}
	if err := database.DB.Model(&models.Product{}).
		Where("id IN ?", req.IDs).
		Update("stock", stockValue).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d products updated", len(req.IDs))})
}

// BulkUpdateOrderStatus updates status for multiple orders (admin only)
func BulkUpdateOrderStatus(c *gin.Context) {
	var req struct {
		IDs    []uint `json:"ids" binding:"required"`
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatuses := []string{"pending", "processing", "shipped", "completed", "cancelled"}
	isValid := false
	for _, s := range validStatuses {
		if req.Status == s {
			isValid = true
			break
		}
	}
	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	if err := database.DB.Model(&models.Order{}).
		Where("id IN ?", req.IDs).
		Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d orders updated", len(req.IDs))})
}

