package controllers

import (
	"fmt"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// PaymentGatewayConfig represents the configuration for a payment gateway
type PaymentGatewayConfig struct {
	Gateway      string `json:"gateway" binding:"required"`      // stripe, sslcommerz, paypal
	IsActive     bool   `json:"is_active"`                       // Whether this gateway is enabled
	IsTestMode   bool   `json:"is_test_mode"`                    // Test mode flag
	PublicKey    string `json:"public_key,omitempty"`             // Public/API key
	SecretKey    string `json:"secret_key,omitempty"`            // Secret key
	MerchantID   string `json:"merchant_id,omitempty"`           // Merchant ID (for SSLCommerz)
	StoreID      string `json:"store_id,omitempty"`              // Store ID (for SSLCommerz)
	StorePassword string `json:"store_password,omitempty"`       // Store password (for SSLCommerz)
	ClientID     string `json:"client_id,omitempty"`             // Client ID (for PayPal)
	ClientSecret string `json:"client_secret,omitempty"`         // Client Secret (for PayPal)
	WebhookURL   string `json:"webhook_url,omitempty"`           // Webhook URL for callbacks
	AdditionalConfig map[string]interface{} `json:"additional_config,omitempty"` // Additional gateway-specific config
}

// GetActivePaymentGateways returns only active payment gateways for public checkout (no auth required)
func GetActivePaymentGateways(c *gin.Context) {
	var settings []models.Setting
	
	// Fetch only active payment gateway settings
	gatewayKeys := []string{
		"payment_gateway_stripe_active",
		"payment_gateway_stripe_test_mode",
		"payment_gateway_sslcommerz_active",
		"payment_gateway_sslcommerz_test_mode",
		"payment_gateway_paypal_active",
		"payment_gateway_paypal_test_mode",
		"payment_gateway_default",
	}
	
	if err := database.DB.Where("key IN ?", gatewayKeys).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment gateway settings"})
		return
	}

	// Convert to map for easier access
	settingsMap := make(map[string]string)
	for _, setting := range settings {
		settingsMap[setting.Key] = setting.Value
	}

	// Build only active gateway configurations (without sensitive data)
	var activeGateways []gin.H
	defaultGateway := settingsMap["payment_gateway_default"]
	
	// Stripe
	if settingsMap["payment_gateway_stripe_active"] == "true" {
		activeGateways = append(activeGateways, gin.H{
			"gateway":    "stripe",
			"is_active":  true,
			"is_test_mode": settingsMap["payment_gateway_stripe_test_mode"] == "true",
		})
		if defaultGateway == "" {
			defaultGateway = "stripe"
		}
	}
	
	// SSLCommerz
	if settingsMap["payment_gateway_sslcommerz_active"] == "true" {
		activeGateways = append(activeGateways, gin.H{
			"gateway":    "sslcommerz",
			"is_active":  true,
			"is_test_mode": settingsMap["payment_gateway_sslcommerz_test_mode"] == "true",
		})
		if defaultGateway == "" {
			defaultGateway = "sslcommerz"
		}
	}
	
	// PayPal
	if settingsMap["payment_gateway_paypal_active"] == "true" {
		activeGateways = append(activeGateways, gin.H{
			"gateway":    "paypal",
			"is_active":  true,
			"is_test_mode": settingsMap["payment_gateway_paypal_test_mode"] == "true",
		})
		if defaultGateway == "" {
			defaultGateway = "paypal"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"gateways":        activeGateways,
		"default_gateway": defaultGateway,
	})
}

// GetPaymentGateways returns all payment gateway configurations (admin only)
func GetPaymentGateways(c *gin.Context) {
	var settings []models.Setting
	
	// Fetch all payment gateway related settings
	gatewayKeys := []string{
		"payment_gateway_stripe_active",
		"payment_gateway_stripe_test_mode",
		"payment_gateway_stripe_public_key",
		"payment_gateway_stripe_secret_key",
		"payment_gateway_stripe_webhook_url",
		"payment_gateway_sslcommerz_active",
		"payment_gateway_sslcommerz_test_mode",
		"payment_gateway_sslcommerz_store_id",
		"payment_gateway_sslcommerz_store_password",
		"payment_gateway_sslcommerz_merchant_id",
		"payment_gateway_sslcommerz_webhook_url",
		"payment_gateway_paypal_active",
		"payment_gateway_paypal_test_mode",
		"payment_gateway_paypal_client_id",
		"payment_gateway_paypal_client_secret",
		"payment_gateway_paypal_webhook_url",
		"payment_gateway_default", // Which gateway is set as default
	}
	
	if err := database.DB.Where("key IN ?", gatewayKeys).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment gateway settings"})
		return
	}

	// Convert to map for easier access
	settingsMap := make(map[string]string)
	for _, setting := range settings {
		settingsMap[setting.Key] = setting.Value
	}

	// Build gateway configurations
	gateways := []PaymentGatewayConfig{
		{
			Gateway:      "stripe",
			IsActive:     settingsMap["payment_gateway_stripe_active"] == "true",
			IsTestMode:   settingsMap["payment_gateway_stripe_test_mode"] == "true",
			PublicKey:    settingsMap["payment_gateway_stripe_public_key"],
			SecretKey:    settingsMap["payment_gateway_stripe_secret_key"],
			WebhookURL:   settingsMap["payment_gateway_stripe_webhook_url"],
		},
		{
			Gateway:      "sslcommerz",
			IsActive:     settingsMap["payment_gateway_sslcommerz_active"] == "true",
			IsTestMode:   settingsMap["payment_gateway_sslcommerz_test_mode"] == "true",
			StoreID:      settingsMap["payment_gateway_sslcommerz_store_id"],
			StorePassword: settingsMap["payment_gateway_sslcommerz_store_password"],
			MerchantID:   settingsMap["payment_gateway_sslcommerz_merchant_id"],
			WebhookURL:   settingsMap["payment_gateway_sslcommerz_webhook_url"],
		},
		{
			Gateway:      "paypal",
			IsActive:     settingsMap["payment_gateway_paypal_active"] == "true",
			IsTestMode:   settingsMap["payment_gateway_paypal_test_mode"] == "true",
			ClientID:     settingsMap["payment_gateway_paypal_client_id"],
			ClientSecret: settingsMap["payment_gateway_paypal_client_secret"],
			WebhookURL:   settingsMap["payment_gateway_paypal_webhook_url"],
		},
	}

	defaultGateway := settingsMap["payment_gateway_default"]
	if defaultGateway == "" {
		defaultGateway = "stripe"
	}

	c.JSON(http.StatusOK, gin.H{
		"gateways":        gateways,
		"default_gateway": defaultGateway,
	})
}

// UpdatePaymentGateway updates a payment gateway configuration (admin only)
func UpdatePaymentGateway(c *gin.Context) {
	var req PaymentGatewayConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate gateway name
	validGateways := map[string]bool{
		"stripe":     true,
		"sslcommerz": true,
		"paypal":    true,
	}
	if !validGateways[req.Gateway] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway name. Must be one of: stripe, sslcommerz, paypal"})
		return
	}

	// Prepare settings to save
	settingsToSave := map[string]string{
		fmt.Sprintf("payment_gateway_%s_active", req.Gateway):     boolToString(req.IsActive),
		fmt.Sprintf("payment_gateway_%s_test_mode", req.Gateway):  boolToString(req.IsTestMode),
	}

	// Gateway-specific fields
	switch req.Gateway {
	case "stripe":
		if req.PublicKey != "" {
			settingsToSave["payment_gateway_stripe_public_key"] = req.PublicKey
		}
		if req.SecretKey != "" {
			settingsToSave["payment_gateway_stripe_secret_key"] = req.SecretKey
		}
		if req.WebhookURL != "" {
			settingsToSave["payment_gateway_stripe_webhook_url"] = req.WebhookURL
		}
	case "sslcommerz":
		if req.StoreID != "" {
			settingsToSave["payment_gateway_sslcommerz_store_id"] = req.StoreID
		}
		if req.StorePassword != "" {
			settingsToSave["payment_gateway_sslcommerz_store_password"] = req.StorePassword
		}
		if req.MerchantID != "" {
			settingsToSave["payment_gateway_sslcommerz_merchant_id"] = req.MerchantID
		}
		if req.WebhookURL != "" {
			settingsToSave["payment_gateway_sslcommerz_webhook_url"] = req.WebhookURL
		}
	case "paypal":
		if req.ClientID != "" {
			settingsToSave["payment_gateway_paypal_client_id"] = req.ClientID
		}
		if req.ClientSecret != "" {
			settingsToSave["payment_gateway_paypal_client_secret"] = req.ClientSecret
		}
		if req.WebhookURL != "" {
			settingsToSave["payment_gateway_paypal_webhook_url"] = req.WebhookURL
		}
	}

	// Save settings
	for key, value := range settingsToSave {
		var setting models.Setting
		result := database.DB.Where("key = ?", key).First(&setting)
		
		if result.Error != nil {
			// Create new setting
			setting = models.Setting{
				Key:   key,
				Value: value,
				Type:  "string",
			}
			database.DB.Create(&setting)
		} else {
			// Update existing setting
			setting.Value = value
			database.DB.Save(&setting)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Payment gateway %s updated successfully", req.Gateway)})
}

// SetDefaultPaymentGateway sets the default payment gateway (admin only)
func SetDefaultPaymentGateway(c *gin.Context) {
	var req struct {
		Gateway string `json:"gateway" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate gateway name
	validGateways := map[string]bool{
		"stripe":     true,
		"sslcommerz": true,
		"paypal":    true,
	}
	if !validGateways[req.Gateway] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway name. Must be one of: stripe, sslcommerz, paypal"})
		return
	}

	// Save default gateway setting
	var setting models.Setting
	result := database.DB.Where("key = ?", "payment_gateway_default").First(&setting)
	
	if result.Error != nil {
		// Create new setting
		setting = models.Setting{
			Key:   "payment_gateway_default",
			Value: req.Gateway,
			Type:  "string",
		}
		database.DB.Create(&setting)
	} else {
		// Update existing setting
		setting.Value = req.Gateway
		database.DB.Save(&setting)
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Default payment gateway set to %s", req.Gateway)})
}

// Helper function to convert bool to string
func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

