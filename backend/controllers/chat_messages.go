package controllers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	if err := database.DB.Preload("Messages.AdminUser").Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Where("id = ?", chatID).First(&chat).Error; err != nil {
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
	if err := database.DB.Preload("Messages.AdminUser").Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Where("id = ?", chatID).First(&chat).Error; err != nil {
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
		ChatID:     uint(chatID),
		Sender:     "admin", // Admin/support staff messages use "admin" to distinguish from AI and user messages
		AdminUserID: &adminID, // Store which admin sent this message
		Message:    req.Message,
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

// EndChat allows customers (authenticated or anonymous) to end their own chat
func EndChat(c *gin.Context) {
	chatIDStr := c.Param("id")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var chat models.Chat
	if err := database.DB.First(&chat, chatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	// Get user ID if authenticated (optional)
	var userID *uint
	if userIDVal, exists := c.Get("userID"); exists {
		id := userIDVal.(uint)
		userID = &id
	}

	// Get client IP for anonymous users
	clientIP := c.ClientIP()

	// Verify ownership (same logic as GetChatMessages):
	// 1. For authenticated users: chat must belong to the user
	// 2. For anonymous users: chat must match IP (or be legacy with empty IP) and be recent (within 7 days)
	isOwner := false
	if userID != nil && chat.UserID != nil && *chat.UserID == *userID {
		isOwner = true
		log.Printf("EndChat: Verified ownership for authenticated user_id=%d, chat_id=%d", *userID, chat.ID)
	} else if userID == nil && chat.UserID == nil {
		// For anonymous users, check if IP matches (for recent chats within 7 days)
		sevenDaysAgo := time.Now().AddDate(0, 0, -7)
		if chat.IPAddress == clientIP && chat.CreatedAt.After(sevenDaysAgo) {
			isOwner = true
			log.Printf("EndChat: Verified ownership by IP=%s for chat_id=%d", clientIP, chat.ID)
		} else if chat.IPAddress == "" && chat.CreatedAt.After(sevenDaysAgo) {
			// Legacy chat without IP (created before IP tracking was added)
			// Allow ending if recent (within 7 days) for backward compatibility
			isOwner = true
			log.Printf("EndChat: Verified ownership for legacy chat (empty IP) chat_id=%d", chat.ID)
		} else {
			log.Printf("EndChat: Ownership check failed - chat_id=%d, user_id=%v, chat_ip=%s, client_ip=%s, created_at=%v", 
				chat.ID, userID, chat.IPAddress, clientIP, chat.CreatedAt)
		}
	} else {
		log.Printf("EndChat: Ownership check failed - user_id mismatch: chat_id=%d, user_id=%v, chat.user_id=%v", 
			chat.ID, userID, chat.UserID)
	}

	if !isOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to end this chat"})
		return
	}

	// Only allow ending active chats
	if chat.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chat is already ended or resolved"})
		return
	}

	// Update chat status to resolved
	chat.Status = "resolved"
	if err := database.DB.Save(&chat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to end chat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Chat ended successfully",
		"chat_id": chat.ID,
	})
}

// EscalateChat allows customers to escalate their chat to human support
// This changes the chat status to "pending" to signal that it needs human attention
func EscalateChat(c *gin.Context) {
	chatIDStr := c.Param("id")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chat ID"})
		return
	}

	var chat models.Chat
	if err := database.DB.First(&chat, chatID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat not found"})
		return
	}

	// Get user ID if authenticated (optional)
	var userID *uint
	if userIDVal, exists := c.Get("userID"); exists {
		id := userIDVal.(uint)
		userID = &id
	}

	// Get client IP for anonymous users
	clientIP := c.ClientIP()

	// Verify ownership (same logic as GetChatMessages and EndChat)
	isOwner := false
	if userID != nil && chat.UserID != nil && *chat.UserID == *userID {
		isOwner = true
		log.Printf("EscalateChat: Verified ownership for authenticated user_id=%d, chat_id=%d", *userID, chat.ID)
	} else if userID == nil && chat.UserID == nil {
		// For anonymous users, check if IP matches (for recent chats within 7 days)
		sevenDaysAgo := time.Now().AddDate(0, 0, -7)
		if chat.IPAddress == clientIP && chat.CreatedAt.After(sevenDaysAgo) {
			isOwner = true
			log.Printf("EscalateChat: Verified ownership by IP=%s for chat_id=%d", clientIP, chat.ID)
		} else if chat.IPAddress == "" && chat.CreatedAt.After(sevenDaysAgo) {
			// Legacy chat without IP
			isOwner = true
			log.Printf("EscalateChat: Verified ownership for legacy chat (empty IP) chat_id=%d", chat.ID)
		} else {
			log.Printf("EscalateChat: Ownership check failed - chat_id=%d, user_id=%v, chat_ip=%s, client_ip=%s", 
				chat.ID, userID, chat.IPAddress, clientIP)
		}
	}

	if !isOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to escalate this chat"})
		return
	}

	// Only allow escalating active chats
	if chat.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only active chats can be escalated to support"})
		return
	}

	// Update chat status to pending (signals that human support is needed)
	chat.Status = "pending"
	chat.UpdatedAt = time.Now()
	if err := database.DB.Save(&chat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to escalate chat"})
		return
	}

	// Optionally add a system message to the chat indicating escalation
	escalationMessage := models.ChatMessage{
		ChatID:  uint(chatID),
		Sender:  "ai", // System message
		Message: "Your chat has been escalated to our support team. A support agent will respond shortly.",
	}
	database.DB.Create(&escalationMessage)

	c.JSON(http.StatusOK, gin.H{
		"message": "Chat escalated to support successfully",
		"chat_id": chat.ID,
		"status":  "pending",
	})
}

