package controllers

import (
	"net/http"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateOrderRequest struct {
	Address    string `json:"address" binding:"required"`
	City       string `json:"city" binding:"required"`
	PostalCode string `json:"postal_code" binding:"required"`
	Country    string `json:"country" binding:"required"`
	CouponCode string `json:"coupon_code"`
}

func CreateOrder(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req CreateOrderRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get cart items
	var cartItems []models.Cart
	if err := database.DB.Preload("Product").Where("user_id = ?", userID).Find(&cartItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cart"})
		return
	}

	if len(cartItems) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cart is empty"})
		return
	}

	// Calculate total and check stock
	var total float64
	for _, item := range cartItems {
		if item.Product.Stock < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Insufficient stock for product: " + item.Product.Name,
			})
			return
		}
		total += item.Product.Price * float64(item.Quantity)
	}

		// Apply coupon if provided
		var discount float64
		if req.CouponCode != "" {
			var coupon models.Coupon
			if err := database.DB.Where("code = ? AND is_active = ?", req.CouponCode, true).First(&coupon).Error; err == nil {
				now := time.Now()
				// Check validity period (inclusive start and end to match ValidateCoupon)
				valid := !now.Before(coupon.ValidFrom) && !now.After(coupon.ValidUntil)
			if valid && (coupon.UsageLimit == 0 || coupon.UsedCount < coupon.UsageLimit) {
				if total >= coupon.MinPurchase {
					if coupon.Type == "percentage" {
						discount = total * (coupon.Value / 100)
						if coupon.MaxDiscount > 0 && discount > coupon.MaxDiscount {
							discount = coupon.MaxDiscount
						}
					} else {
						discount = coupon.Value
					}
					total -= discount
					// Increment coupon usage
					coupon.UsedCount++
					database.DB.Save(&coupon)
				}
			}
		}
	}

	// Create order
	order := models.Order{
		UserID:     userID.(uint),
		Total:      total,
		Status:     "pending",
		Address:    req.Address,
		City:       req.City,
		PostalCode: req.PostalCode,
		Country:    req.Country,
	}

	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Create order items and update stock
	for _, cartItem := range cartItems {
		orderItem := models.OrderItem{
			OrderID:    order.ID,
			ProductID:  cartItem.ProductID,
			Quantity:   cartItem.Quantity,
			Price:      cartItem.Product.Price,
			Variations: cartItem.Variations, // Preserve variations from cart
		}
		database.DB.Create(&orderItem)

		// Update product stock
		cartItem.Product.Stock -= cartItem.Quantity
		database.DB.Save(&cartItem.Product)
	}

	// Clear cart
	database.DB.Where("user_id = ?", userID).Delete(&models.Cart{})

	// Load order with items
	database.DB.Preload("Items").Preload("Items.Product").First(&order, order.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Order created successfully",
		"order":   order,
	})
}

func GetOrders(c *gin.Context) {
	userID, _ := c.Get("userID")

	var orders []models.Order
	if err := database.DB.Preload("Items").Preload("Items.Product").
		Where("user_id = ?", userID).Order("created_at DESC").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, orders)
}

func GetOrder(c *gin.Context) {
	userID, _ := c.Get("userID")
	id := c.Param("id")

	var order models.Order
	if err := database.DB.Preload("Items").Preload("Items.Product").
		Where("id = ? AND user_id = ?", id, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, order)
}

