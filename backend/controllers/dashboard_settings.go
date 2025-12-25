package controllers

import (
	"encoding/json"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetDashboardSettings returns dashboard settings (admin only)
func GetDashboardSettings(c *gin.Context) {
	var setting models.Setting
	if err := database.DB.Where("key = ?", "dashboard_settings").First(&setting).Error; err != nil {
		// Return default settings if not found
		c.JSON(http.StatusOK, gin.H{
			"settings": map[string]interface{}{
				"layout": "default",
				"widgets": []string{},
			},
		})
		return
	}

	// Parse JSON value
	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(setting.Value), &settings); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"settings": map[string]interface{}{
				"layout": "default",
				"widgets": []string{},
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// UpdateDashboardSettings updates dashboard settings (admin only)
func UpdateDashboardSettings(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to JSON string
	jsonData, err := json.Marshal(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid settings format"})
		return
	}

	var setting models.Setting
	result := database.DB.Where("key = ?", "dashboard_settings").First(&setting)

	if result.Error != nil {
		// Create new setting
		setting = models.Setting{
			Key:   "dashboard_settings",
			Value: string(jsonData),
			Type:  "json",
		}
		database.DB.Create(&setting)
	} else {
		// Update existing setting
		setting.Value = string(jsonData)
		setting.Type = "json"
		database.DB.Save(&setting)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dashboard settings updated successfully"})
}

