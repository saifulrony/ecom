package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// LogAction logs an audit action
func LogAction(userID uint, action, entityType string, entityID uint, changes interface{}, c *gin.Context) {
	var changesJSON []byte
	var err error
	if changes != nil {
		changesJSON, err = json.Marshal(changes)
		if err != nil {
			// Log error but continue - use error message as changes
			changesJSON = []byte(fmt.Sprintf(`{"error": "failed to marshal changes: %s"}`, err.Error()))
		}
	}
	
	auditLog := models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Changes:    string(changesJSON),
		IPAddress:  c.ClientIP(),
		UserAgent:  c.GetHeader("User-Agent"),
	}
	
	database.DB.Create(&auditLog)
}

// GetAuditLogs returns audit logs (admin only)
func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	query := database.DB.Preload("User").Order("created_at DESC")

	// Filters
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.AuditLog{}).Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (int(total) + limit - 1) / limit,
		},
	})
}

