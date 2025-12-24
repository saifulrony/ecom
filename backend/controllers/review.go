package controllers

import (
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateReview creates a new product review
func CreateReview(c *gin.Context) {
	userID, _ := c.Get("userID")
	productID := c.Param("id")

	var req struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Title   string `json:"title"`
		Comment string `json:"comment"`
		OrderID uint   `json:"order_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if product exists
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	review := models.Review{
		ProductID:  product.ID,
		UserID:     userID.(uint),
		OrderID:    req.OrderID,
		Rating:     req.Rating,
		Title:      req.Title,
		Comment:    req.Comment,
		IsApproved: false, // Require admin approval
	}

	if err := database.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	database.DB.Preload("User").First(&review, review.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Review submitted", "review": review})
}

// GetProductReviews returns all approved reviews for a product
func GetProductReviews(c *gin.Context) {
	productID := c.Param("id")
	var reviews []models.Review

	query := database.DB.Preload("User").Where("product_id = ? AND is_approved = ?", productID, true).Order("created_at DESC")
	
	// Optional: filter by rating
	if rating := c.Query("rating"); rating != "" {
		query = query.Where("rating = ?", rating)
	}

	if err := query.Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	// Calculate average rating
	var avgRating float64
	var ratingCount int64
	database.DB.Model(&models.Review{}).Where("product_id = ? AND is_approved = ?", productID, true).
		Select("AVG(rating) as avg_rating, COUNT(*) as rating_count").
		Row().Scan(&avgRating, &ratingCount)

	c.JSON(http.StatusOK, gin.H{
		"reviews":     reviews,
		"average_rating": avgRating,
		"total_reviews":  ratingCount,
	})
}

// GetReviews returns all reviews (admin only)
func GetReviews(c *gin.Context) {
	var reviews []models.Review
	query := database.DB.Preload("User").Preload("Product").Order("created_at DESC")

	// Filters
	if status := c.Query("status"); status != "" {
		if status == "approved" {
			query = query.Where("is_approved = ?", true)
		} else if status == "pending" {
			query = query.Where("is_approved = ?", false)
		}
	}

	if productID := c.Query("product_id"); productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	if err := query.Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reviews": reviews})
}

// ApproveReview approves a review (admin only)
func ApproveReview(c *gin.Context) {
	reviewID := c.Param("id")
	var review models.Review
	if err := database.DB.First(&review, reviewID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch review"})
		return
	}

	review.IsApproved = true
	if err := database.DB.Save(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve review"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Review approved", "review": review})
}

// DeleteReview deletes a review (admin only)
func DeleteReview(c *gin.Context) {
	reviewID := c.Param("id")
	if err := database.DB.Delete(&models.Review{}, reviewID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete review"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Review deleted"})
}

