package controllers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

type ChatRequest struct {
	Message string `json:"message" binding:"required"`
	ChatID  uint   `json:"chat_id"` // Optional: if provided, use existing chat
}

// HandleChat processes chat messages and returns AI responses
func HandleChat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message is required"})
		return
	}

	// Get user ID if authenticated (optional)
	var userID *uint
	if userIDVal, exists := c.Get("userID"); exists {
		id := userIDVal.(uint)
		userID = &id
	}

	// Get client IP address (for anonymous user tracking fallback)
	clientIP := c.ClientIP()

	// Find or create chat session
	var chat models.Chat
	
	// First, try to use provided chat_id if valid
	if req.ChatID > 0 {
		log.Printf("Chat: Looking for existing chat with ID=%d", req.ChatID)
		if err := database.DB.Where("id = ? AND status = ?", req.ChatID, "active").First(&chat).Error; err == nil {
			// Verify ownership: if user is authenticated, chat must belong to them
			// If user is anonymous (userID is nil), chat must also have nil user_id
			if (userID == nil && chat.UserID == nil) || (userID != nil && chat.UserID != nil && *chat.UserID == *userID) {
				// Valid chat session found, use it
				log.Printf("Chat: Found valid existing chat ID=%d, reusing it", chat.ID)
				// chat.ID is set, so we'll use this chat
			} else {
				// Chat doesn't belong to this user, ignore it and try to find/create appropriate one
				log.Printf("Chat: Chat ID=%d exists but doesn't belong to user, ignoring", req.ChatID)
				chat = models.Chat{}
			}
		} else {
			log.Printf("Chat: Chat ID=%d not found or not active, will try IP fallback", req.ChatID)
			// Chat not found, chat.ID is 0, will try IP fallback below
		}
	} else {
		log.Printf("Chat: No chat_id provided in request, will try IP fallback for anonymous users")
	}
	
	// If no valid chat found yet, try to find existing active chat for this user
	if chat.ID == 0 {
		if userID != nil {
			// For authenticated users, try to find existing active chat
			database.DB.Where("user_id = ? AND status = ?", *userID, "active").
				Order("created_at DESC").
				First(&chat)
		} else {
			// For anonymous users: try to find active chat by IP address (fallback when localStorage is cleared)
			// Only check chats created in the last 24 hours to avoid matching old chats
			cutoffTime := time.Now().Add(-24 * time.Hour)
			log.Printf("Chat: Trying to find existing chat for IP=%s (anonymous user)", clientIP)
			if err := database.DB.Where("user_id IS NULL AND ip_address = ? AND status = ? AND created_at > ?", clientIP, "active", cutoffTime).
				Order("created_at DESC").
				First(&chat).Error; err == nil {
				log.Printf("Chat: Found existing chat ID=%d for IP=%s (localStorage was cleared, using IP fallback)", chat.ID, clientIP)
			} else {
				log.Printf("Chat: No existing chat found for IP=%s, will create new one", clientIP)
			}
		}
	}

	// If still no chat found, create a new one
	if chat.ID == 0 {
		log.Printf("Chat: Creating new chat session for user_id=%v, ip=%s", userID, clientIP)
		chat = models.Chat{
			UserID:    userID,
			IPAddress: clientIP, // Store IP for anonymous users (fallback when localStorage is cleared)
			Status:    "active",
		}
		if err := database.DB.Create(&chat).Error; err != nil {
			log.Printf("Chat: Failed to create chat: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat session"})
			return
		}
		log.Printf("Chat: Created new chat ID=%d for user_id=%v, ip=%s", chat.ID, userID, clientIP)
	}

	// Save user message
	userMessage := models.ChatMessage{
		ChatID:  chat.ID,
		Sender:  "user",
		Message: req.Message,
	}
	if err := database.DB.Create(&userMessage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Generate AI response
	message := strings.ToLower(strings.TrimSpace(req.Message))
	response := generateAIResponse(message)

	// Save AI response
	aiMessage := models.ChatMessage{
		ChatID:  chat.ID,
		Sender:  "ai",
		Message: response,
	}
	if err := database.DB.Create(&aiMessage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save AI response"})
		return
	}

	// Update chat updated_at
	chat.UpdatedAt = time.Now()
	database.DB.Save(&chat)

	c.JSON(http.StatusOK, gin.H{
		"response": response,
		"chat_id":  chat.ID,
	})
}

// generateAIResponse generates an AI response based on the user's message
// This is a rule-based system that can be easily upgraded to use OpenAI or other AI services
func generateAIResponse(message string) string {
	// Check product inquiries FIRST (before greetings) to avoid false matches
	// Product inquiries - check for product-related keywords
	if containsAny(message, []string{"product", "item", "buy", "purchase", "shop", "basketball", "shoe", "clothing", "electronics", "book", "category", "specific", "want to know", "tell me about", "about your"}) {
		return "You can browse our products by visiting the Products page. We have a wide variety of items available. Would you like to know about a specific product or category?"
	}

	// Greetings (check after product inquiries)
	if containsAny(message, []string{"hello", "hi", "hey", "greetings"}) {
		return "Hello! I'm here to help you with your shopping needs. How can I assist you today?"
	}

	// Order inquiries
	if containsAny(message, []string{"order", "track", "delivery", "shipping", "status"}) {
		return "To check your order status, please log in to your account and visit the Orders page. You can track all your orders there. If you need help with a specific order, please provide your order number."
	}

	// Payment inquiries
	if containsAny(message, []string{"payment", "pay", "checkout", "card", "money", "price", "cost"}) {
		return "We accept various payment methods including credit cards, debit cards, and mobile payments. You can complete your purchase securely at checkout. All transactions are encrypted and secure."
	}

	// Shipping inquiries
	if containsAny(message, []string{"shipping", "delivery", "ship", "arrive", "when", "time"}) {
		return "We offer free shipping on orders over ৳2,000. Standard delivery takes 3-5 business days. Express delivery options are also available at checkout. Your order will be processed within 24 hours of payment confirmation."
	}

	// Return/Refund inquiries
	if containsAny(message, []string{"return", "refund", "exchange", "cancel"}) {
		return "We offer free returns within 30 days of purchase. Items must be in original condition with tags attached. To initiate a return, please visit your Orders page and select the item you'd like to return. Refunds are processed within 5-7 business days."
	}

	// Account inquiries
	if containsAny(message, []string{"account", "login", "register", "sign up", "profile"}) {
		return "You can create an account by clicking on Register in the top menu. Having an account allows you to track orders, save your address, and enjoy a faster checkout experience."
	}

	// Cart inquiries (avoid matching "basket" in "basketball")
	if containsAny(message, []string{"cart", "add to cart", "remove from cart", "shopping cart"}) {
		return "You can add items to your cart by clicking the 'Add to Cart' button on any product page. View your cart anytime by clicking the cart icon in the header. You can update quantities or remove items from there."
	}

	// Discount/Coupon inquiries
	if containsAny(message, []string{"discount", "coupon", "promo", "code", "sale", "offer"}) {
		return "We frequently run promotions and sales! You can apply coupon codes at checkout. Check our homepage for current deals and special offers. Sign up for our newsletter to receive exclusive discount codes."
	}

	// Support/Help inquiries
	if containsAny(message, []string{"help", "support", "assist", "problem", "issue", "contact"}) {
		return "I'm here to help! You can ask me about products, orders, shipping, returns, or anything else related to your shopping experience. If you need to speak with a human representative, please contact our support team through the contact form."
	}

	// Stock/Availability inquiries
	if containsAny(message, []string{"stock", "available", "in stock", "out of stock", "when available"}) {
		return "Product availability is shown on each product page. If an item is out of stock, you can sign up to be notified when it's back in stock. We restock popular items regularly."
	}

	// Size/Color/Variation inquiries
	if containsAny(message, []string{"size", "color", "colour", "variant", "option", "choose"}) {
		return "Product variations like size, color, and other options are available on the product detail page. Simply select your preferred options before adding to cart."
	}

	// General questions
	if containsAny(message, []string{"what", "how", "where", "when", "why"}) {
		return "I'd be happy to help! Could you please provide more details about what you're looking for? I can assist with product information, order tracking, shipping, returns, and more."
	}

	// Default response
	return "Thank you for your message! I'm here to help with product inquiries, order tracking, shipping information, returns, and general shopping assistance. How can I help you today?"
}

// containsAny checks if the message contains any of the given keywords (case-insensitive)
func containsAny(message string, keywords []string) bool {
	messageLower := strings.ToLower(message)
	for _, keyword := range keywords {
		if strings.Contains(messageLower, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}

