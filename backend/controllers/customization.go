package controllers

import (
	"encoding/json"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetCustomization retrieves customization settings for a specific key
func GetCustomization(c *gin.Context) {
	key := c.Param("key")

	var customization models.ThemeCustomization
	if err := database.DB.Where("key = ?", key).First(&customization).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return default settings if not found
			c.JSON(http.StatusOK, gin.H{
				"key":      key,
				"settings": getDefaultSettings(key),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customization"})
		return
	}

	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(customization.Settings), &settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"key":      customization.Key,
		"settings": settings,
	})
}

// GetAllCustomizations retrieves all customization settings
func GetAllCustomizations(c *gin.Context) {
	var customizations []models.ThemeCustomization
	if err := database.DB.Find(&customizations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customizations"})
		return
	}

	result := make(map[string]interface{})
	for _, customization := range customizations {
		var settings map[string]interface{}
		if err := json.Unmarshal([]byte(customization.Settings), &settings); err != nil {
			continue
		}
		result[customization.Key] = settings
	}

	// Add defaults for missing keys
	defaultKeys := []string{"header", "footer", "body", "slider", "colors", "typography", "layout"}
	for _, key := range defaultKeys {
		if _, exists := result[key]; !exists {
			result[key] = getDefaultSettings(key)
		}
	}

	c.JSON(http.StatusOK, gin.H{"customizations": result})
}

// UpdateCustomization updates or creates customization settings
func UpdateCustomization(c *gin.Context) {
	key := c.Param("key")

	var req struct {
		Settings map[string]interface{} `json:"settings" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settingsJSON, err := json.Marshal(req.Settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize settings"})
		return
	}

	var customization models.ThemeCustomization
	if err := database.DB.Where("key = ?", key).First(&customization).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new
			customization = models.ThemeCustomization{
				Key:      key,
				Settings: string(settingsJSON),
			}
			if err := database.DB.Create(&customization).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customization"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customization"})
			return
		}
	} else {
		// Update existing
		customization.Settings = string(settingsJSON)
		if err := database.DB.Save(&customization).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update customization"})
			return
		}
	}

	var settings map[string]interface{}
	json.Unmarshal([]byte(customization.Settings), &settings)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Customization updated successfully",
		"key":      customization.Key,
		"settings": settings,
	})
}

// ResetCustomization resets customization to defaults
func ResetCustomization(c *gin.Context) {
	key := c.Param("key")

	if err := database.DB.Where("key = ?", key).Delete(&models.ThemeCustomization{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset customization"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Customization reset to defaults",
		"key":     key,
		"settings": getDefaultSettings(key),
	})
}

// getDefaultSettings returns default settings for a given key
func getDefaultSettings(key string) map[string]interface{} {
	defaults := map[string]map[string]interface{}{
		"header": {
			"background_color": "#1a1a1a",
			"text_color": "#ffffff",
			"height": "70px",
			"sticky": true,
			"show_search": true,
			"show_cart": true,
			"show_wishlist": true,
			"logo_position": "left",
		},
		"footer": {
			"background_color": "#1a1a1a",
			"text_color": "#cccccc",
			"show_copyright": true,
			"show_social_links": true,
			"columns": 4,
		},
		"body": {
			"background_color": "#f5f5f5",
			"text_color": "#1a1a1a",
			"container_width": "1200px",
			"padding": "20px",
		},
		"slider": {
			"enabled": true,
			"height": "500px",
			"autoplay": true,
			"autoplay_speed": 5000,
			"show_arrows": true,
			"show_dots": true,
			"overlay_opacity": 0.3,
		},
		"colors": {
			"primary": "#ff6b35",
			"secondary": "#ff8c5a",
			"success": "#10b981",
			"danger": "#ef4444",
			"warning": "#f59e0b",
			"info": "#3b82f6",
		},
		"typography": {
			"font_family": "Inter, sans-serif",
			"heading_font": "Inter, sans-serif",
			"base_font_size": "16px",
			"heading_size_h1": "2.5rem",
			"heading_size_h2": "2rem",
			"heading_size_h3": "1.75rem",
			"line_height": "1.6",
		},
		"layout": {
			"product_grid_columns": 4,
			"product_card_style": "default",
			"show_product_rating": true,
			"show_product_wishlist": true,
			"button_style": "rounded",
			"border_radius": "8px",
		},
	}

	if settings, ok := defaults[key]; ok {
		return settings
	}
	return make(map[string]interface{})
}

