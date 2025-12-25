package controllers

import (
	"net/http"
	"strconv"
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
	var subtotal float64
	for _, item := range cartItems {
		if item.Product.Stock < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Insufficient stock for product: " + item.Product.Name,
			})
			return
		}
		subtotal += item.Product.Price * float64(item.Quantity)
	}

	// Get tax rate - try regional first, then fallback to settings
	var taxRate float64
	var taxRateModel models.TaxRate
	
	// Try to get regional tax rate (most specific match first)
	// Try city match
	if req.City != "" {
		if err := database.DB.Where("country = ? AND region = ? AND city = ?", req.Country, req.City, req.City).First(&taxRateModel).Error; err == nil {
			taxRate = taxRateModel.Rate
		}
	}
	
	// Try region match if city didn't match
	if taxRate == 0 && req.City != "" {
		if err := database.DB.Where("country = ? AND region = ? AND (city = '' OR city IS NULL)", req.Country, req.City).First(&taxRateModel).Error; err == nil {
			taxRate = taxRateModel.Rate
		}
	}
	
	// Try country match if region didn't match
	if taxRate == 0 {
		if err := database.DB.Where("country = ? AND (region = '' OR region IS NULL) AND (city = '' OR city IS NULL)", req.Country).First(&taxRateModel).Error; err == nil {
			taxRate = taxRateModel.Rate
		}
	}
	
	// Fallback to default tax rate
	if taxRate == 0 {
		if err := database.DB.Where("is_default = ?", true).First(&taxRateModel).Error; err == nil {
			taxRate = taxRateModel.Rate
		}
	}
	
	// Final fallback to settings
	if taxRate == 0 {
		var taxSetting models.Setting
		if err := database.DB.Where("key = ?", "tax_rate").First(&taxSetting).Error; err == nil {
			if rate, err := strconv.ParseFloat(taxSetting.Value, 64); err == nil {
				taxRate = rate
			}
		}
	}

	// Calculate tax
	tax := subtotal * (taxRate / 100)

	// Apply coupon if provided
	var discount float64
	var total float64
	if req.CouponCode != "" {
		var coupon models.Coupon
		if err := database.DB.Where("code = ? AND is_active = ?", req.CouponCode, true).First(&coupon).Error; err == nil {
			now := time.Now()
			// Check validity period (inclusive start and end to match ValidateCoupon)
			valid := !now.Before(coupon.ValidFrom) && !now.After(coupon.ValidUntil)
			if valid && (coupon.UsageLimit == 0 || coupon.UsedCount < coupon.UsageLimit) {
				if subtotal >= coupon.MinPurchase {
					if coupon.Type == "percentage" {
						discount = subtotal * (coupon.Value / 100)
						if coupon.MaxDiscount > 0 && discount > coupon.MaxDiscount {
							discount = coupon.MaxDiscount
						}
					} else {
						discount = coupon.Value
					}
					// Increment coupon usage
					coupon.UsedCount++
					database.DB.Save(&coupon)
				}
			}
		}
	}

	// Get shipping cost from settings
	var shippingCost float64
	var shippingSetting models.Setting
	if err := database.DB.Where("key = ?", "shipping_cost").First(&shippingSetting).Error; err == nil {
		if cost, err := strconv.ParseFloat(shippingSetting.Value, 64); err == nil {
			shippingCost = cost
		}
	}

	// Calculate final total: subtotal - discount + tax + shipping
	total = subtotal - discount + tax + shippingCost

	// Create order
	order := models.Order{
		UserID:     userID.(uint),
		Subtotal:   subtotal,
		Tax:        tax,
		Discount:   discount,
		Shipping:   shippingCost,
		Total:      total,
		TaxRate:    taxRate,
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

