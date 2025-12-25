package controllers

import (
	"encoding/json"
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetPages retrieves all pages
func GetPages(c *gin.Context) {
	var pages []models.Page
	query := database.DB.Order("created_at DESC")

	// Filter by published status
	if published := c.Query("published"); published != "" {
		if published == "true" {
			query = query.Where("is_published = ?", true)
		} else if published == "false" {
			query = query.Where("is_published = ?", false)
		}
	}

	if err := query.Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch pages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pages": pages})
}

// GetPage retrieves a specific page by ID or page_id
func GetPage(c *gin.Context) {
	identifier := c.Param("id")
	var page models.Page

	// Try to find by page_id first (slug), then by ID
	var err error
	if len(identifier) > 0 && identifier[0] >= '0' && identifier[0] <= '9' {
		// Looks like numeric ID
		err = database.DB.Where("id = ?", identifier).First(&page).Error
	} else {
		// Looks like slug
		err = database.DB.Where("page_id = ?", identifier).First(&page).Error
	}

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Page not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch page"})
		return
	}

	// Parse components JSON
	var components interface{} = []interface{}{} // Default to empty array
	if page.Components != "" {
		if err := json.Unmarshal([]byte(page.Components), &components); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse page components"})
			return
		}
		// Ensure components is an array (not null or other type)
		if components == nil {
			components = []interface{}{}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          page.ID,
		"page_id":    page.PageID,
		"title":      page.Title,
		"description": page.Description,
		"components": components,
		"is_published": page.IsPublished,
		"created_at":  page.CreatedAt,
		"updated_at":  page.UpdatedAt,
	})
}

// CreatePage creates a new page
func CreatePage(c *gin.Context) {
	var req struct {
		PageID      string      `json:"page_id" binding:"required"`
		Title       string      `json:"title" binding:"required"`
		Description string      `json:"description"`
		Components  interface{} `json:"components" binding:"required"`
		IsPublished bool        `json:"is_published"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if page_id already exists
	var existingPage models.Page
	if err := database.DB.Where("page_id = ?", req.PageID).First(&existingPage).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Page ID already exists"})
		return
	}

	// Convert components to JSON - ensure it's always valid JSON
	var componentsJSON []byte
	var err error
	if req.Components != nil {
		componentsJSON, err = json.Marshal(req.Components)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize components: " + err.Error()})
			return
		}
	} else {
		// Default to empty array if components is nil
		componentsJSON, _ = json.Marshal([]interface{}{})
	}

	page := models.Page{
		PageID:      req.PageID,
		Title:       req.Title,
		Description: req.Description,
		Components:  string(componentsJSON),
		IsPublished: req.IsPublished,
	}

	if err := database.DB.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create page"})
		return
	}

	var components interface{}
	json.Unmarshal([]byte(page.Components), &components)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Page created successfully",
		"page": gin.H{
			"id":          page.ID,
			"page_id":    page.PageID,
			"title":      page.Title,
			"description": page.Description,
			"components": components,
			"is_published": page.IsPublished,
		},
	})
}

// UpdatePage updates an existing page
func UpdatePage(c *gin.Context) {
	id := c.Param("id")
	var page models.Page

	// Try to find by page_id first (slug), then by ID
	var err error
	if len(id) > 0 && id[0] >= '0' && id[0] <= '9' {
		// Looks like numeric ID
		err = database.DB.Where("id = ?", id).First(&page).Error
	} else {
		// Looks like slug (page_id)
		err = database.DB.Where("page_id = ?", id).First(&page).Error
	}

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Page not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch page: " + err.Error()})
		return
	}

	var req struct {
		PageID      string      `json:"page_id"`
		Title       string      `json:"title"`
		Description string      `json:"description"`
		Components  interface{} `json:"components"`
		IsPublished *bool       `json:"is_published"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if new page_id conflicts with existing page
	if req.PageID != "" && req.PageID != page.PageID {
		var existingPage models.Page
		if err := database.DB.Where("page_id = ? AND id != ?", req.PageID, page.ID).First(&existingPage).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Page ID already exists"})
			return
		}
		page.PageID = req.PageID
	}

	if req.Title != "" {
		page.Title = req.Title
	}
	if req.Description != "" {
		page.Description = req.Description
	}
	// Always update components - if nil, use empty array
	if req.Components != nil {
		componentsJSON, err := json.Marshal(req.Components)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize components: " + err.Error()})
			return
		}
		page.Components = string(componentsJSON)
	} else {
		// If components is not provided, keep existing or set to empty array
		if page.Components == "" {
			componentsJSON, _ := json.Marshal([]interface{}{})
			page.Components = string(componentsJSON)
		}
	}
	if req.IsPublished != nil {
		page.IsPublished = *req.IsPublished
	}

	if err := database.DB.Save(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update page: " + err.Error()})
		return
	}

	var components interface{} = []interface{}{}
	if page.Components != "" {
		if err := json.Unmarshal([]byte(page.Components), &components); err != nil {
			// If unmarshal fails, return empty array
			components = []interface{}{}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Page updated successfully",
		"page": gin.H{
			"id":          page.ID,
			"page_id":    page.PageID,
			"title":      page.Title,
			"description": page.Description,
			"components": components,
			"is_published": page.IsPublished,
		},
	})
}

// DeletePage deletes a page
func DeletePage(c *gin.Context) {
	id := c.Param("id")

	if err := database.DB.Where("id = ? OR page_id = ?", id, id).Delete(&models.Page{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Page deleted successfully"})
}

