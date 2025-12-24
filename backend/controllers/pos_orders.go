package controllers

import (
	"net/http"
	"strconv"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetPOSOrders returns all POS orders (admin only)
func GetPOSOrders(c *gin.Context) {
	var orders []models.Order
	query := database.DB.Where("is_pos = ?", true).Preload("User").Preload("Items").Preload("Items.Product").Preload("Payments").Order("created_at DESC")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Search by order ID or customer name
	if search := c.Query("search"); search != "" {
		query = query.Where("id::text ILIKE ? OR user_id::text ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Order{}).Count(&total)

	// Order by created_at DESC (newest first)
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch POS orders"})
		return
	}

	// Calculate payment totals for each order
	type OrderWithPayments struct {
		models.Order
		TotalPaid        float64 `json:"total_paid"`
		RemainingBalance float64 `json:"remaining_balance"`
		IsFullyPaid      bool    `json:"is_fully_paid"`
	}

	var ordersWithPayments []OrderWithPayments
	for _, order := range orders {
		var totalPaid float64
		for _, payment := range order.Payments {
			totalPaid += payment.Amount
		}
		remainingBalance := order.Total - totalPaid
		isFullyPaid := remainingBalance <= 0

		ordersWithPayments = append(ordersWithPayments, OrderWithPayments{
			Order:            order,
			TotalPaid:        totalPaid,
			RemainingBalance: remainingBalance,
			IsFullyPaid:      isFullyPaid,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": ordersWithPayments,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (int(total) + limit - 1) / limit,
		},
	})
}

// GetPOSOrder returns a single POS order by ID (admin only)
func GetPOSOrder(c *gin.Context) {
	orderID := c.Param("id")
	var order models.Order

	if err := database.DB.Where("is_pos = ?", true).
		Preload("User").
		Preload("Items").
		Preload("Items.Product").
		Preload("Payments").
		First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "POS order not found"})
		return
	}

	// Calculate payment totals
	var totalPaid float64
	for _, payment := range order.Payments {
		totalPaid += payment.Amount
	}
	remainingBalance := order.Total - totalPaid
	isFullyPaid := remainingBalance <= 0

	c.JSON(http.StatusOK, gin.H{
		"order":             order,
		"total_paid":        totalPaid,
		"remaining_balance": remainingBalance,
		"is_fully_paid":      isFullyPaid,
	})
}

