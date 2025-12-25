package controllers

import (
	"encoding/json"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetPOSSettings returns POS settings (admin only)
func GetPOSSettings(c *gin.Context) {
	var setting models.Setting
	if err := database.DB.Where("key = ?", "pos_settings").First(&setting).Error; err != nil {
		// Return default settings if not found
		c.JSON(http.StatusOK, gin.H{
			"settings": map[string]interface{}{
				"stock_type": "website",
			},
		})
		return
	}

	// Parse JSON value
	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(setting.Value), &settings); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"settings": map[string]interface{}{
				"stock_type": "website",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// UpdatePOSSettings updates POS settings (admin only)
func UpdatePOSSettings(c *gin.Context) {
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
	result := database.DB.Where("key = ?", "pos_settings").First(&setting)

	if result.Error != nil {
		// Create new setting
		setting = models.Setting{
			Key:   "pos_settings",
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

	c.JSON(http.StatusOK, gin.H{"message": "POS settings updated successfully"})
}

