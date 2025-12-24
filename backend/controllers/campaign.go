package controllers

import (
	"net/http"
	"strconv"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetCampaigns returns all campaigns (admin only)
func GetCampaigns(c *gin.Context) {
	var campaigns []models.Campaign
	if err := database.DB.Order("created_at DESC").Find(&campaigns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaigns"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"campaigns": campaigns})
}

// GetCampaign returns a single campaign (admin only)
func GetCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.Campaign
	if err := database.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"campaign": campaign})
}

// CreateCampaign creates a new campaign (admin only)
func CreateCampaign(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Code        string `json:"code" binding:"required"`
		Description string `json:"description"`
		StartDate   string `json:"start_date" binding:"required"`
		EndDate     string `json:"end_date" binding:"required"`
		IsActive    bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if campaign code already exists
	var existingCampaign models.Campaign
	if err := database.DB.Where("code = ?", req.Code).First(&existingCampaign).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Campaign code already exists"})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
		return
	}

	// Validate date range
	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date must be after start date"})
		return
	}

	campaign := models.Campaign{
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		StartDate:   startDate,
		EndDate:     endDate,
		IsActive:    req.IsActive,
	}

	if err := database.DB.Create(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create campaign"})
		return
	}

	// Log audit action
	if userID, exists := c.Get("userID"); exists {
		LogAction(userID.(uint), "create", "campaign", campaign.ID, gin.H{"name": campaign.Name, "code": campaign.Code}, c)
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Campaign created successfully", "campaign": campaign})
}

// UpdateCampaign updates a campaign (admin only)
func UpdateCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.Campaign
	if err := database.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Code        string `json:"code"`
		Description string `json:"description"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		IsActive    *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if code is being changed and if new code already exists
	if req.Code != "" && req.Code != campaign.Code {
		var existingCampaign models.Campaign
		if err := database.DB.Where("code = ? AND id != ?", req.Code, id).First(&existingCampaign).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Campaign code already exists"})
			return
		}
		campaign.Code = req.Code
	}

	if req.Name != "" {
		campaign.Name = req.Name
	}
	if req.Description != "" {
		campaign.Description = req.Description
	}
	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
			return
		}
		campaign.StartDate = startDate
	}
	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
			return
		}
		campaign.EndDate = endDate
	}
	if req.IsActive != nil {
		campaign.IsActive = *req.IsActive
	}

	// Validate date range
	if campaign.EndDate.Before(campaign.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date must be after start date"})
		return
	}

	if err := database.DB.Save(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaign"})
		return
	}

	// Log audit action
	if userID, exists := c.Get("userID"); exists {
		LogAction(userID.(uint), "update", "campaign", campaign.ID, gin.H{"name": campaign.Name}, c)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign updated successfully", "campaign": campaign})
}

// DeleteCampaign deletes a campaign (admin only)
func DeleteCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.Campaign
	if err := database.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	if err := database.DB.Delete(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete campaign"})
		return
	}

	// Log audit action
	if userID, exists := c.Get("userID"); exists {
		LogAction(userID.(uint), "delete", "campaign", campaign.ID, gin.H{"name": campaign.Name}, c)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign deleted successfully"})
}

// GetCampaignStats returns statistics for a campaign (admin only)
func GetCampaignStats(c *gin.Context) {
	id := c.Param("id")
	var campaign models.Campaign
	if err := database.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	// Get orders that used this campaign code
	var orders []models.Order
	database.DB.Where("coupon_code = ? OR notes LIKE ?", campaign.Code, "%"+campaign.Code+"%").Find(&orders)

	// Calculate unique visitors
	uniqueUserIDs := make(map[uint]bool)
	for _, order := range orders {
		uniqueUserIDs[order.UserID] = true
	}
	uniqueVisitors := len(uniqueUserIDs)

	// Calculate totals
	totalOrders := len(orders)
	totalRevenue := 0.0
	for _, order := range orders {
		totalRevenue += order.Total
	}

	// Mock cart additions (in real app, this would come from analytics)
	cartAdditions := uniqueVisitors * 1.5
	if cartAdditions < 0 {
		cartAdditions = 0
	}

	// Calculate conversion rate
	conversionRate := 0.0
	if uniqueVisitors > 0 {
		conversionRate = (float64(totalOrders) / float64(uniqueVisitors)) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"campaign": campaign,
		"stats": gin.H{
			"unique_visitors": uniqueVisitors,
			"total_orders":   totalOrders,
			"total_revenue":  totalRevenue,
			"cart_additions": int(cartAdditions),
			"conversion_rate": conversionRate,
		},
	})
}

