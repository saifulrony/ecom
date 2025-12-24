package controllers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetChatMessages retrieves all messages for a specific chat
func GetChatMessages(c *gin.Context) {
	chatIDStr := c.Param("id")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}
	
	var chat models.Chat
	if err := database.DB.Preload("Messages").Where("id = ?", chatID).First(&chat).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	// Get user ID if authenticated (optional)
	var userID *uint
	if userIDVal, exists := c.Get("userID"); exists {
		id := userIDVal.(uint)
		userID = &id
	}

	// Get client IP address
	clientIP := c.ClientIP()

	// Verify ownership: if user is authenticated, chat must belong to them
	// If user is anonymous (userID is nil), chat must also have nil user_id
	// For anonymous users, also check IP address as fallback (in case localStorage was cleared)
	isOwner := false
	if userID != nil && chat.UserID != nil && *chat.UserID == *userID {
		isOwner = true
	} else if userID == nil && chat.UserID == nil {
		// For anonymous users, check if IP matches (only for recent chats within 24 hours)
		cutoffTime := time.Now().Add(-24 * time.Hour)
		if chat.IPAddress == clientIP && chat.CreatedAt.After(cutoffTime) {
			isOwner = true
			log.Printf("GetChatMessages: Verified ownership by IP=%s for chat ID=%d", clientIP, chat.ID)
		} else if chat.IPAddress == "" {
			// Legacy chat without IP (created before IP tracking was added)
			// Allow access for backward compatibility
			isOwner = true
		}
	}

	if !isOwner {
		log.Printf("GetChatMessages: Access denied for chat ID=%d, user_id=%v, ip=%s", chatID, userID, clientIP)
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"chat_id":  chat.ID,
		"messages": chat.Messages,
	})
}

// GetChatMessagesAdmin allows admin to retrieve all messages for a specific chat (no ownership check)
func GetChatMessagesAdmin(c *gin.Context) {
	chatIDStr := c.Param("id")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}
	
	var chat models.Chat
	if err := database.DB.Preload("Messages").Where("id = ?", chatID).First(&chat).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	// Admin can view any chat - no ownership check needed
	c.JSON(http.StatusOK, gin.H{
		"chat_id":  chat.ID,
		"messages": chat.Messages,
	})
}

// GetActiveChat finds the active chat for the current user/IP (useful when localStorage is cleared)
func GetActiveChat(c *gin.Context) {
	// Get user ID if authenticated (optional)
	var userID *uint
	if userIDVal, exists := c.Get("userID"); exists {
		id := userIDVal.(uint)
		userID = &id
	}

	var chat models.Chat
	clientIP := c.ClientIP()

	if userID != nil {
		// For authenticated users, find active chat by user_id
		if err := database.DB.Where("user_id = ? AND status = ?", *userID, "active").
			Order("created_at DESC").
			First(&chat).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No active chat found"})
			return
		}
	} else {
		// For anonymous users, find active chat by IP address (last 24 hours)
		cutoffTime := time.Now().Add(-24 * time.Hour)
		if err := database.DB.Where("user_id IS NULL AND ip_address = ? AND status = ? AND created_at > ?", clientIP, "active", cutoffTime).
			Order("created_at DESC").
			First(&chat).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No active chat found"})
			return
		}
		log.Printf("GetActiveChat: Found chat ID=%d for IP=%s (localStorage was cleared)", chat.ID, clientIP)
	}

	c.JSON(http.StatusOK, gin.H{
		"chat_id": chat.ID,
	})
}

// SendAdminMessage allows admin/support staff to send a message to a chat
func SendAdminMessage(c *gin.Context) {
	chatIDStr := c.Param("id")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message is required"})
		return
	}

	// Get admin user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	adminID := userID.(uint)

	// Verify chat exists
	var chat models.Chat
	if err := database.DB.First(&chat, chatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	// Assign chat to admin if not already assigned
	if chat.SupportStaffID == nil {
		chat.SupportStaffID = &adminID
		chat.Status = "active"
		if err := database.DB.Save(&chat).Error; err != nil {
			log.Printf("Failed to assign chat to admin: %v", err)
		}
	}

	// Create message
	message := models.ChatMessage{
		ChatID:  uint(chatID),
		Sender:  "ai", // Using "ai" to distinguish from customer messages (can change to "admin" if needed)
		Message: req.Message,
	}

	if err := database.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Update chat updated_at
	chat.UpdatedAt = time.Now()
	database.DB.Save(&chat)

	c.JSON(http.StatusOK, gin.H{
		"message": "Message sent successfully",
		"message_id": message.ID,
	})
}

// UpdateChatStatus allows admin to update chat status (e.g., resolve, pending)
func UpdateChatStatus(c *gin.Context) {
	chatIDStr := c.Param("id")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=active resolved pending"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid status is required (active, resolved, pending)"})
		return
	}

	var chat models.Chat
	if err := database.DB.First(&chat, chatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	chat.Status = req.Status
	if err := database.DB.Save(&chat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update chat status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Chat status updated successfully",
		"chat": chat,
	})
}

