package controllers

import (
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetWishlist returns all wishlist items for the authenticated user
func GetWishlist(c *gin.Context) {
	userID, _ := c.Get("userID")

	var wishlistItems []models.Wishlist
	if err := database.DB.Preload("Product").Preload("Product.Category").
		Where("user_id = ?", userID).Find(&wishlistItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch wishlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"wishlist": wishlistItems})
}

// AddToWishlist adds a product to the wishlist
func AddToWishlist(c *gin.Context) {
	userID, _ := c.Get("userID")
	
	var req struct {
		ProductID uint `json:"product_id" binding:"required"`
	}
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

	// Check if already in wishlist
	var existingWishlist models.Wishlist
	if err := database.DB.Where("user_id = ? AND product_id = ?", userID, req.ProductID).
		First(&existingWishlist).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Product already in wishlist"})
		return
	}

	// Add to wishlist
	wishlistItem := models.Wishlist{
		UserID:    userID.(uint),
		ProductID: req.ProductID,
	}

	if err := database.DB.Create(&wishlistItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to wishlist"})
		return
	}

	database.DB.Preload("Product").First(&wishlistItem, wishlistItem.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Added to wishlist", "wishlist": wishlistItem})
}

// RemoveFromWishlist removes a product from the wishlist
func RemoveFromWishlist(c *gin.Context) {
	userID, _ := c.Get("userID")
	productID := c.Param("product_id")

	var wishlistItem models.Wishlist
	if err := database.DB.Where("user_id = ? AND product_id = ?", userID, productID).
		First(&wishlistItem).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found in wishlist"})
		return
	}

	if err := database.DB.Delete(&wishlistItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from wishlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from wishlist"})
}

// CheckWishlist checks if a product is in the user's wishlist
func CheckWishlist(c *gin.Context) {
	userID, _ := c.Get("userID")
	productID := c.Param("product_id")

	var wishlistItem models.Wishlist
	isInWishlist := database.DB.Where("user_id = ? AND product_id = ?", userID, productID).
		First(&wishlistItem).Error == nil

	c.JSON(http.StatusOK, gin.H{"in_wishlist": isInWishlist})
}

