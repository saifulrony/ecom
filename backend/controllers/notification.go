package controllers

import (
	"net/http"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetNotifications returns notifications for the authenticated user (admin only)
func GetNotifications(c *gin.Context) {
	userID, _ := c.Get("userID")
	
	var notifications []models.Notification
	query := database.DB.Where("user_id IS NULL OR user_id = ?", userID).Order("created_at DESC")
	
	// Optional: filter by read status
	if read := c.Query("read"); read != "" {
		if read == "true" {
			query = query.Where("read = ?", true)
		} else if read == "false" {
			query = query.Where("read = ?", false)
		}
	}
	
	if err := query.Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

// CreateNotification creates a new notification (admin only)
func CreateNotification(c *gin.Context) {
	var req struct {
		Type    string `json:"type" binding:"required"`
		Title   string `json:"title" binding:"required"`
		Message string `json:"message" binding:"required"`
		UserID  uint   `json:"user_id"` // Optional: if null, system-wide
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	notification := models.Notification{
		Type:    req.Type,
		Title:   req.Title,
		Message: req.Message,
		UserID:  req.UserID,
		Read:    false,
	}

	if err := database.DB.Create(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Notification created", "notification": notification})
}

// MarkNotificationAsRead marks a notification as read (admin only)
func MarkNotificationAsRead(c *gin.Context) {
	notificationID := c.Param("id")
	userID, _ := c.Get("userID")

	var notification models.Notification
	if err := database.DB.Where("id = ? AND (user_id IS NULL OR user_id = ?)", notificationID, userID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	notification.Read = true
	if err := database.DB.Save(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read", "notification": notification})
}

// MarkAllNotificationsAsRead marks all notifications as read (admin only)
func MarkAllNotificationsAsRead(c *gin.Context) {
	userID, _ := c.Get("userID")

	if err := database.DB.Model(&models.Notification{}).
		Where("(user_id IS NULL OR user_id = ?) AND read = ?", userID, false).
		Update("read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// DeleteNotification deletes a notification (admin only)
func DeleteNotification(c *gin.Context) {
	notificationID := c.Param("id")
	userID, _ := c.Get("userID")

	if err := database.DB.Where("id = ? AND (user_id IS NULL OR user_id = ?)", notificationID, userID).Delete(&models.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

