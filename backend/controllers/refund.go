package controllers

import (
	"net/http"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateRefundRequest creates a refund request (customer)
func CreateRefundRequest(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req struct {
		OrderID     uint    `json:"order_id" binding:"required"`
		OrderItemID uint    `json:"order_item_id"` // Optional
		Amount      float64 `json:"amount" binding:"required"`
		Reason      string  `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify order belongs to user
	var order models.Order
	if err := database.DB.Where("id = ? AND user_id = ?", req.OrderID, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Validate amount
	if req.Amount > order.Total {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refund amount cannot exceed order total"})
		return
	}

	refund := models.Refund{
		OrderID:     req.OrderID,
		OrderItemID: req.OrderItemID,
		Amount:      req.Amount,
		Reason:      req.Reason,
		Status:      "pending",
	}

	if err := database.DB.Create(&refund).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create refund request"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Refund request created", "refund": refund})
}

// GetRefunds returns refunds for the authenticated user
func GetRefunds(c *gin.Context) {
	userID, _ := c.Get("userID")
	var refunds []models.Refund

	// Get refunds for user's orders
	database.DB.Preload("Order").Preload("Order.User").
		Joins("JOIN orders ON refunds.order_id = orders.id").
		Where("orders.user_id = ?", userID).
		Order("created_at DESC").
		Find(&refunds)

	c.JSON(http.StatusOK, gin.H{"refunds": refunds})
}

// GetAllRefunds returns all refunds (admin only)
func GetAllRefunds(c *gin.Context) {
	var refunds []models.Refund
	query := database.DB.Preload("Order").Preload("Order.User").Order("created_at DESC")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&refunds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch refunds"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"refunds": refunds})
}

// UpdateRefundStatus updates refund status (admin only)
func UpdateRefundStatus(c *gin.Context) {
	refundID := c.Param("id")
	adminID, _ := c.Get("userID")
	var refund models.Refund
	if err := database.DB.First(&refund, refundID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Refund not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch refund"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=pending approved rejected processed"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	refund.Status = req.Status
	refund.ProcessedBy = adminID.(uint)
	now := time.Now()
	refund.ProcessedAt = &now
	if req.Notes != "" {
		refund.Notes = req.Notes
	}

	if err := database.DB.Save(&refund).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update refund"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Refund status updated", "refund": refund})
}

