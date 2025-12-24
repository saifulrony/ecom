package controllers

import (
	"net/http"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// parseDateString parses a date string in YYYY-MM-DD format to time.Time at midnight UTC
func parseDateString(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, nil
	}
	// Parse as date only (YYYY-MM-DD)
	parsed, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, err
	}
	// Return at midnight UTC
	return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC), nil
}

// GetCoupons returns all coupons (admin only)
func GetCoupons(c *gin.Context) {
	var coupons []models.Coupon
	if err := database.DB.Order("created_at DESC").Find(&coupons).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch coupons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"coupons": coupons})
}

// CreateCoupon creates a new coupon (admin only)
func CreateCoupon(c *gin.Context) {
	var req struct {
		Code        string  `json:"code" binding:"required"`
		Type        string  `json:"type" binding:"required"`
		Value       float64 `json:"value" binding:"required"`
		MinPurchase float64 `json:"min_purchase"`
		MaxDiscount float64 `json:"max_discount"`
		UsageLimit  int     `json:"usage_limit"`
		ValidFrom   string  `json:"valid_from" binding:"required"`
		ValidUntil  string  `json:"valid_until" binding:"required"`
		IsActive    bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date strings
	validFrom, err := parseDateString(req.ValidFrom)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid valid_from date format. Use YYYY-MM-DD"})
		return
	}
	validUntil, err := parseDateString(req.ValidUntil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid valid_until date format. Use YYYY-MM-DD"})
		return
	}

	// Check if code already exists
	var existingCoupon models.Coupon
	if err := database.DB.Where("code = ?", req.Code).First(&existingCoupon).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon code already exists"})
		return
	}

	coupon := models.Coupon{
		Code:        req.Code,
		Type:        req.Type,
		Value:       req.Value,
		MinPurchase: req.MinPurchase,
		MaxDiscount: req.MaxDiscount,
		UsageLimit:  req.UsageLimit,
		ValidFrom:   validFrom,
		ValidUntil:  validUntil,
		IsActive:    req.IsActive,
	}

	if err := database.DB.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create coupon"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Coupon created", "coupon": coupon})
}

// UpdateCoupon updates a coupon (admin only)
func UpdateCoupon(c *gin.Context) {
	couponID := c.Param("id")
	var coupon models.Coupon
	if err := database.DB.First(&coupon, couponID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coupon not found"})
		return
	}

	var req struct {
		Code        string  `json:"code"`
		Type        string  `json:"type"`
		Value       float64 `json:"value"`
		MinPurchase float64 `json:"min_purchase"`
		MaxDiscount float64 `json:"max_discount"`
		UsageLimit  int     `json:"usage_limit"`
		ValidFrom   string  `json:"valid_from"`
		ValidUntil  string  `json:"valid_until"`
		IsActive    bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Code != "" && req.Code != coupon.Code {
		// Check if new code already exists
		var existingCoupon models.Coupon
		if err := database.DB.Where("code = ?", req.Code).First(&existingCoupon).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon code already exists"})
			return
		}
		coupon.Code = req.Code
	}
	if req.Type != "" {
		coupon.Type = req.Type
	}
	if req.Value > 0 {
		coupon.Value = req.Value
	}
	if req.MinPurchase > 0 {
		coupon.MinPurchase = req.MinPurchase
	}
	if req.MaxDiscount > 0 {
		coupon.MaxDiscount = req.MaxDiscount
	}
	if req.UsageLimit > 0 {
		coupon.UsageLimit = req.UsageLimit
	}
	if req.ValidFrom != "" {
		validFrom, err := parseDateString(req.ValidFrom)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid valid_from date format. Use YYYY-MM-DD"})
			return
		}
		coupon.ValidFrom = validFrom
	}
	if req.ValidUntil != "" {
		validUntil, err := parseDateString(req.ValidUntil)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid valid_until date format. Use YYYY-MM-DD"})
			return
		}
		coupon.ValidUntil = validUntil
	}
	coupon.IsActive = req.IsActive

	if err := database.DB.Save(&coupon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update coupon"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Coupon updated", "coupon": coupon})
}

// DeleteCoupon deletes a coupon (admin only)
func DeleteCoupon(c *gin.Context) {
	couponID := c.Param("id")
	if err := database.DB.Delete(&models.Coupon{}, couponID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete coupon"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Coupon deleted"})
}

// ValidateCoupon validates a coupon code (public)
func ValidateCoupon(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon code is required"})
		return
	}

	var coupon models.Coupon
	if err := database.DB.Where("code = ? AND is_active = ?", code, true).First(&coupon).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or inactive coupon code"})
		return
	}

	now := time.Now()
	if now.Before(coupon.ValidFrom) || now.After(coupon.ValidUntil) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon is not valid at this time"})
		return
	}

	if coupon.UsageLimit > 0 && coupon.UsedCount >= coupon.UsageLimit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon usage limit reached"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"coupon": coupon,
	})
}

