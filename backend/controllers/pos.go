package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"
	"ecom-backend/utils"

	"github.com/gin-gonic/gin"
)

type POSOrderRequest struct {
	CustomerID  uint                   `json:"customer_id"` // Optional, for walk-in customers can be 0
	Items       []POSOrderItem         `json:"items" binding:"required"`
	Address     string                 `json:"address"`
	City        string                 `json:"city"`
	PostalCode  string                 `json:"postal_code"`
	Country     string                 `json:"country"`
	CouponCode  string                 `json:"coupon_code"`
	Payments    []POSPayment           `json:"payments" binding:"required"` // Multiple payments
	Notes       string                 `json:"notes"`
	StockType   string                 `json:"stock_type"` // "website" or "showroom", defaults to "website"
}

type POSPayment struct {
	Method    string  `json:"method" binding:"required"` // cash, card, mobile, etc.
	Amount    float64 `json:"amount" binding:"required,gt=0"`
	Reference string  `json:"reference"` // Transaction reference, receipt number, etc.
}

type POSOrderItem struct {
	ProductID  uint              `json:"product_id" binding:"required"`
	Quantity   int               `json:"quantity" binding:"required,min=1"`
	Price      float64           `json:"price" binding:"required"`
	Variations map[string]string `json:"variations"`
}

// CreatePOSOrder creates an order directly from POS without using cart
func CreatePOSOrder(c *gin.Context) {
	var req POSOrderRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Debug: Log received payments
	log.Printf("Received %d payments for POS order", len(req.Payments))
	for i, payment := range req.Payments {
		log.Printf("Payment %d: Method=%s, Amount=%.2f, Reference=%s", i+1, payment.Method, payment.Amount, payment.Reference)
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No items in order"})
		return
	}

	// If no customer ID provided, use walk-in customer
	// Find or create a default "Walk-in Customer" user
	var userID uint
	if req.CustomerID > 0 {
		var user models.User
		if err := database.DB.First(&user, req.CustomerID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
			return
		}
		userID = user.ID
	} else {
		// For walk-in customers, find or create a default "Walk-in" user
		var walkInUser models.User
		if err := database.DB.Where("email = ?", "walkin@pos.local").First(&walkInUser).Error; err != nil {
			// Create walk-in user if doesn't exist
			hashedPassword, _ := utils.HashPassword("walkin123")
			walkInUser = models.User{
				Email:    "walkin@pos.local",
				Password: hashedPassword,
				Name:     "Walk-in Customer",
				Role:     "user",
			}
			database.DB.Create(&walkInUser)
		}
		userID = walkInUser.ID
	}

	// Determine stock type (default to website)
	stockType := req.StockType
	if stockType == "" {
		stockType = "website"
	}
	if stockType != "website" && stockType != "showroom" {
		stockType = "website"
	}

	// Calculate total and check stock
	var total float64
	for _, item := range req.Items {
		var product models.Product
		if err := database.DB.First(&product, item.ProductID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		// Check appropriate stock field
		availableStock := product.Stock
		if stockType == "showroom" {
			availableStock = product.PosStock
		}

		if availableStock < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Insufficient " + stockType + " stock for product: " + product.Name + 
					" (Available: " + strconv.Itoa(availableStock) + ", Requested: " + strconv.Itoa(item.Quantity) + ")",
			})
			return
		}

		total += item.Price * float64(item.Quantity)
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
					coupon.UsedCount++
					database.DB.Save(&coupon)
				}
			}
		}
	}

	// Set default values for walk-in customers
	address := req.Address
	city := req.City
	postalCode := req.PostalCode
	country := req.Country
	if address == "" {
		address = "Walk-in Customer"
	}
	if city == "" {
		city = "N/A"
	}
	if postalCode == "" {
		postalCode = "N/A"
	}
	if country == "" {
		country = "N/A"
	}

	// Validate payments
	var totalPaid float64
	for _, payment := range req.Payments {
		if payment.Amount <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payment amount must be greater than 0"})
			return
		}
		totalPaid += payment.Amount
	}

	if totalPaid > total {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Total payments exceed order total"})
		return
	}

	// Determine order status based on payment
	orderStatus := "pending"
	if totalPaid >= total {
		orderStatus = "completed"
	} else if totalPaid > 0 {
		orderStatus = "partial"
	}

	// Create order
	order := models.Order{
		UserID:     userID,
		Total:      total,
		Status:     orderStatus,
		Address:    address,
		City:       city,
		PostalCode: postalCode,
		Country:    country,
		IsPOS:      true, // Mark as POS order
	}

	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Create payments
	log.Printf("Creating %d payments for order ID %d", len(req.Payments), order.ID)
	for i, payment := range req.Payments {
		paymentRecord := models.Payment{
			OrderID:   order.ID,
			Method:    payment.Method,
			Amount:    payment.Amount,
			Reference: payment.Reference,
		}
		if err := database.DB.Create(&paymentRecord).Error; err != nil {
			log.Printf("Failed to create payment %d: %v", i+1, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
			return
		}
		log.Printf("Created payment %d: ID=%d, Method=%s, Amount=%.2f", i+1, paymentRecord.ID, paymentRecord.Method, paymentRecord.Amount)
	}

	// Create order items and update stock
	for _, item := range req.Items {
		var product models.Product
		database.DB.First(&product, item.ProductID)

		// Serialize variations
		variationsJSON := ""
		if item.Variations != nil && len(item.Variations) > 0 {
			variationsBytes, _ := json.Marshal(item.Variations)
			variationsJSON = string(variationsBytes)
		}

		orderItem := models.OrderItem{
			OrderID:    order.ID,
			ProductID:  item.ProductID,
			Quantity:   item.Quantity,
			Price:      item.Price,
			Variations: variationsJSON,
		}
		database.DB.Create(&orderItem)

		// Update appropriate stock field
		if stockType == "showroom" {
			product.PosStock -= item.Quantity
		} else {
			product.Stock -= item.Quantity
		}
		database.DB.Save(&product)
	}

	// Load order with items and payments
	database.DB.Preload("Items").Preload("Items.Product").Preload("User").Preload("Payments").First(&order, order.ID)

	// Calculate remaining balance
	var totalPaidAmount float64
	for _, payment := range order.Payments {
		totalPaidAmount += payment.Amount
	}
	remainingBalance := order.Total - totalPaidAmount

	c.JSON(http.StatusCreated, gin.H{
		"message":           "POS order created successfully",
		"order":             order,
		"total_paid":        totalPaidAmount,
		"remaining_balance": remainingBalance,
		"is_fully_paid":      remainingBalance <= 0,
	})
}

