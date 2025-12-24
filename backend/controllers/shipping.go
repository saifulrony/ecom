package controllers

import (
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetShippingMethods returns all active shipping methods
func GetShippingMethods(c *gin.Context) {
	var methods []models.ShippingMethod
	query := database.DB.Where("is_active = ?", true)

	if err := query.Find(&methods).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shipping methods"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shipping_methods": methods})
}

// GetAllShippingMethods returns all shipping methods (admin only)
func GetAllShippingMethods(c *gin.Context) {
	var methods []models.ShippingMethod
	if err := database.DB.Find(&methods).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shipping methods"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shipping_methods": methods})
}

// CreateShippingMethod creates a new shipping method (admin only)
func CreateShippingMethod(c *gin.Context) {
	var req struct {
		Name          string  `json:"name" binding:"required"`
		Description   string  `json:"description"`
		Cost          float64 `json:"cost" binding:"required"`
		EstimatedDays int     `json:"estimated_days"`
		IsActive      bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	method := models.ShippingMethod{
		Name:          req.Name,
		Description:   req.Description,
		Cost:          req.Cost,
		EstimatedDays: req.EstimatedDays,
		IsActive:      req.IsActive,
	}

	if req.EstimatedDays == 0 {
		method.EstimatedDays = 7
	}

	if err := database.DB.Create(&method).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipping method"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Shipping method created", "method": method})
}

// UpdateShippingMethod updates a shipping method (admin only)
func UpdateShippingMethod(c *gin.Context) {
	methodID := c.Param("id")
	var method models.ShippingMethod
	if err := database.DB.First(&method, methodID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipping method not found"})
		return
	}

	var req struct {
		Name          string  `json:"name"`
		Description   string  `json:"description"`
		Cost          float64 `json:"cost"`
		EstimatedDays int     `json:"estimated_days"`
		IsActive      bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		method.Name = req.Name
	}
	if req.Description != "" {
		method.Description = req.Description
	}
	if req.Cost > 0 {
		method.Cost = req.Cost
	}
	if req.EstimatedDays > 0 {
		method.EstimatedDays = req.EstimatedDays
	}
	method.IsActive = req.IsActive

	if err := database.DB.Save(&method).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update shipping method"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shipping method updated", "method": method})
}

// DeleteShippingMethod deletes a shipping method (admin only)
func DeleteShippingMethod(c *gin.Context) {
	methodID := c.Param("id")
	if err := database.DB.Delete(&models.ShippingMethod{}, methodID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete shipping method"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shipping method deleted"})
}

