package controllers

import (
	"fmt"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetSettings returns all settings (admin only)
func GetSettings(c *gin.Context) {
	var settings []models.Setting
	if err := database.DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	// Convert to key-value map
	settingsMap := make(map[string]interface{})
	for _, setting := range settings {
		switch setting.Type {
		case "number":
			settingsMap[setting.Key] = setting.Value
		case "boolean":
			settingsMap[setting.Key] = setting.Value == "true"
		case "json":
			settingsMap[setting.Key] = setting.Value
		default:
			settingsMap[setting.Key] = setting.Value
		}
	}

	c.JSON(http.StatusOK, gin.H{"settings": settingsMap})
}

// UpdateSettings updates settings (admin only)
func UpdateSettings(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for key, value := range req {
		var setting models.Setting
		result := database.DB.Where("key = ?", key).First(&setting)

		var valueStr string
		var valueType string

		switch v := value.(type) {
		case float64:
			valueStr = fmt.Sprintf("%.2f", v)
			valueType = "number"
		case bool:
			if v {
				valueStr = "true"
			} else {
				valueStr = "false"
			}
			valueType = "boolean"
		case string:
			valueStr = v
			valueType = "string"
		default:
			valueStr = fmt.Sprintf("%v", v)
			valueType = "string"
		}

		if result.Error != nil {
			// Create new setting
			setting = models.Setting{
				Key:   key,
				Value: valueStr,
				Type:  valueType,
			}
			database.DB.Create(&setting)
		} else {
			// Update existing setting
			setting.Value = valueStr
			setting.Type = valueType
			database.DB.Save(&setting)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// GetSetting returns a specific setting (admin only)
func GetSetting(c *gin.Context) {
	key := c.Param("key")
	var setting models.Setting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Setting not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"setting": setting})
}

// GetPublicSetting returns a specific setting (public, for checkout)
func GetPublicSetting(c *gin.Context) {
	key := c.Param("key")
	// Only allow certain public settings
	allowedKeys := []string{"tax_rate", "shipping_cost"}
	isAllowed := false
	for _, allowedKey := range allowedKeys {
		if key == allowedKey {
			isAllowed = true
			break
		}
	}
	if !isAllowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "Setting not accessible"})
		return
	}

	var setting models.Setting
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"setting": models.Setting{Key: key, Value: "0", Type: "number"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"setting": setting})
}

