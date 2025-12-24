package controllers

import (
	"encoding/json"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

type AddToCartRequest struct {
	ProductID  uint              `json:"product_id" binding:"required"`
	Quantity   int               `json:"quantity" binding:"required,min=1"`
	Variations map[string]string `json:"variations"` // e.g., {"Color": "Red", "Size": "Large"}
}

func GetCart(c *gin.Context) {
	userID, _ := c.Get("userID")

	var cartItems []models.Cart
	if err := database.DB.Preload("Product").Preload("Product.Category").
		Where("user_id = ?", userID).Find(&cartItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cart"})
		return
	}

	var total float64
	for _, item := range cartItems {
		itemPrice := item.Product.Price
		// Parse variations and apply price modifiers if any
		if item.Variations != "" {
			var variations map[string]string
			json.Unmarshal([]byte(item.Variations), &variations)
			// Note: Price modifiers would need to be fetched from variation options
			// For now, we'll just use the base price
		}
		total += itemPrice * float64(item.Quantity)
	}

	c.JSON(http.StatusOK, gin.H{
		"items": cartItems,
		"total": total,
	})
}

func AddToCart(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req AddToCartRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if product exists
	var product models.Product
	if err := database.DB.First(&product, req.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Check stock
	if product.Stock < req.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient stock"})
		return
	}

	// Serialize variations to JSON string
	variationsJSON := ""
	if req.Variations != nil && len(req.Variations) > 0 {
		variationsBytes, _ := json.Marshal(req.Variations)
		variationsJSON = string(variationsBytes)
	}

	// Check if item with same variations already in cart
	var existingCart models.Cart
	query := database.DB.Where("user_id = ? AND product_id = ?", userID, req.ProductID)
	if variationsJSON != "" {
		query = query.Where("variations = ?", variationsJSON)
	} else {
		query = query.Where("variations IS NULL OR variations = ''")
	}
	
	if err := query.First(&existingCart).Error; err == nil {
		// Update quantity
		newQuantity := existingCart.Quantity + req.Quantity
		if newQuantity > product.Stock {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient stock"})
			return
		}
		existingCart.Quantity = newQuantity
		database.DB.Save(&existingCart)
		c.JSON(http.StatusOK, gin.H{"message": "Cart updated", "cart": existingCart})
		return
	}

	// Create new cart item
	cartItem := models.Cart{
		UserID:     userID.(uint),
		ProductID:  req.ProductID,
		Quantity:   req.Quantity,
		Variations: variationsJSON,
	}

	if err := database.DB.Create(&cartItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to cart"})
		return
	}

	database.DB.Preload("Product").First(&cartItem, cartItem.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Added to cart", "cart": cartItem})
}

func UpdateCartItem(c *gin.Context) {
	userID, _ := c.Get("userID")
	id := c.Param("id")
	var req struct {
		Quantity int `json:"quantity" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cartItem models.Cart
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&cartItem).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart item not found"})
		return
	}

	// Check stock
	var product models.Product
	database.DB.First(&product, cartItem.ProductID)
	if product.Stock < req.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient stock"})
		return
	}

	cartItem.Quantity = req.Quantity
	database.DB.Save(&cartItem)

	database.DB.Preload("Product").First(&cartItem, cartItem.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Cart updated", "cart": cartItem})
}

func RemoveFromCart(c *gin.Context) {
	userID, _ := c.Get("userID")
	id := c.Param("id")

	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Cart{}).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item removed from cart"})
}

func ClearCart(c *gin.Context) {
	userID, _ := c.Get("userID")

	if err := database.DB.Where("user_id = ?", userID).Delete(&models.Cart{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear cart"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cart cleared"})
}
