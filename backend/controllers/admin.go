package controllers

import (
	"net/http"
	"strconv"
	"time"

	"ecom-backend/cache"
	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminDashboardStats returns dashboard statistics
func AdminDashboardStats(c *gin.Context) {
	var stats struct {
		TotalUsers    int64   `json:"total_users"`
		TotalProducts int64   `json:"total_products"`
		TotalOrders   int64   `json:"total_orders"`
		TotalRevenue  float64 `json:"total_revenue"`
		PendingOrders int64   `json:"pending_orders"`
		LowStockItems int64   `json:"low_stock_items"`
	}

	database.DB.Model(&models.User{}).Count(&stats.TotalUsers)
	database.DB.Model(&models.Product{}).Count(&stats.TotalProducts)
	database.DB.Model(&models.Order{}).Count(&stats.TotalOrders)
	database.DB.Model(&models.Order{}).Where("status = ?", "pending").Count(&stats.PendingOrders)
	database.DB.Model(&models.Product{}).Where("stock < ?", 10).Count(&stats.LowStockItems)
	database.DB.Model(&models.Order{}).Select("COALESCE(SUM(total), 0)").Scan(&stats.TotalRevenue)

	c.JSON(http.StatusOK, stats)
}

// GetUsers returns all users (admin only)
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// GetCustomers returns all customers (users with role 'user')
func GetCustomers(c *gin.Context) {
	var customers []models.User
	if err := database.DB.Where("role = ?", "user").Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers"})
		return
	}

	c.JSON(http.StatusOK, customers)
}

// GetCustomer returns a single customer with their orders and stats (admin only)
func GetCustomer(c *gin.Context) {
	customerID := c.Param("id")
	var customer models.User
	
	if err := database.DB.Where("id = ? AND role = ?", customerID, "user").First(&customer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	// Get customer orders
	var orders []models.Order
	database.DB.Where("user_id = ?", customer.ID).
		Preload("Items.Product").
		Order("created_at DESC").
		Find(&orders)

	// Calculate stats
	var ordersCount int64
	var totalSpent float64
	database.DB.Model(&models.Order{}).
		Where("user_id = ?", customer.ID).
		Count(&ordersCount)
	database.DB.Model(&models.Order{}).
		Where("user_id = ?", customer.ID).
		Select("COALESCE(SUM(total), 0)").
		Scan(&totalSpent)

	c.JSON(http.StatusOK, gin.H{
		"customer": customer,
		"orders": orders,
		"stats": gin.H{
			"orders_count": ordersCount,
			"total_spent":  totalSpent,
		},
	})
}

// GetChats returns all chat sessions with their messages (admin only)
func GetChats(c *gin.Context) {
	var chats []models.Chat
	
	// Preload user, support staff, and messages (order messages by created_at ASC to get most recent last in slice)
	query := database.DB.Preload("User").Preload("SupportStaff").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Order("updated_at DESC")
	
	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	
	if err := query.Find(&chats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chats"})
		return
	}

	// Format response
	type ChatResponse struct {
		ID              uint      `json:"id"`
		UserID          *uint     `json:"user_id"`
		UserName        string    `json:"user_name"`
		UserEmail       string    `json:"user_email"`
		GuestName       string    `json:"guest_name"`
		GuestEmail      string    `json:"guest_email"`
		Status          string    `json:"status"`
		SupportStaffID  *uint     `json:"support_staff_id"`
		SupportStaffName string   `json:"support_staff_name"`
		SupportStaffEmail string  `json:"support_staff_email"`
		LastMessage     string    `json:"last_message"`
		LastMessageTime string    `json:"last_message_time"`
		CreatedAt       string    `json:"created_at"`
		MessageCount    int       `json:"message_count"`
	}

	chatResponses := make([]ChatResponse, 0)
	for _, chat := range chats {
		response := ChatResponse{
			ID:     chat.ID,
			UserID: chat.UserID,
			Status: chat.Status,
			SupportStaffID: chat.SupportStaffID,
			GuestName: chat.GuestName,
			GuestEmail: chat.GuestEmail,
			CreatedAt: chat.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			MessageCount: len(chat.Messages),
		}

		if chat.User != nil {
			response.UserName = chat.User.Name
			response.UserEmail = chat.User.Email
		} else {
			// Use guest info if available, otherwise show Anonymous
			if chat.GuestName != "" {
				response.UserName = chat.GuestName
			} else {
				response.UserName = "Anonymous"
			}
			if chat.GuestEmail != "" {
				response.UserEmail = chat.GuestEmail
			} else {
				response.UserEmail = "N/A"
			}
		}

		if chat.SupportStaff != nil {
			response.SupportStaffName = chat.SupportStaff.Name
			response.SupportStaffEmail = chat.SupportStaff.Email
		}

		// Get last message
		if len(chat.Messages) > 0 {
			lastMsg := chat.Messages[len(chat.Messages)-1]
			response.LastMessage = lastMsg.Message
			response.LastMessageTime = lastMsg.CreatedAt.Format("2006-01-02T15:04:05Z07:00")
		}

		chatResponses = append(chatResponses, response)
	}

	c.JSON(http.StatusOK, gin.H{"chats": chatResponses})
}

// GetAllOrders returns all orders (admin only)
func GetAllOrders(c *gin.Context) {
	var orders []models.Order
	if err := database.DB.Preload("User").Preload("Items.Product").Order("created_at DESC").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// UpdateOrderStatus updates order status
func UpdateOrderStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderID := c.Param("id")
	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	order.Status = req.Status
	if err := database.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order status updated", "order": order})
}

// CreateProduct creates a new product (admin only)
func CreateProduct(c *gin.Context) {
	var req struct {
		Name        string  `json:"name" binding:"required"`
		Description string  `json:"description"`
		Price       float64 `json:"price" binding:"required"`
		Image       string  `json:"image"`
		Images      string  `json:"images"`
		DisplayType string  `json:"display_type"`
		SKU         string  `json:"sku"`
		Stock       int     `json:"stock"`
		CategoryID  uint    `json:"category_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product := models.Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Image:       req.Image,
		Images:      req.Images,
		DisplayType: req.DisplayType,
		SKU:         req.SKU,
		Stock:       req.Stock,
		CategoryID:  req.CategoryID,
	}
	if product.DisplayType == "" {
		product.DisplayType = "single"
	}

	if err := database.DB.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	// Invalidate product cache
	cache.InvalidateAllProducts()

	// Log audit action
	if userID, exists := c.Get("userID"); exists {
		LogAction(userID.(uint), "create", "product", product.ID, gin.H{"name": product.Name}, c)
	} else {
		LogAction(0, "create", "product", product.ID, gin.H{"name": product.Name}, c)
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Product created", "product": product})
}

// UpdateProduct updates a product (admin only)
func UpdateProduct(c *gin.Context) {
	productID := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Price       float64 `json:"price"`
		Image       string  `json:"image"`
		Images      string  `json:"images"`
		DisplayType string  `json:"display_type"`
		SKU         string  `json:"sku"`
		Stock       *int    `json:"stock"` // Use pointer to distinguish between 0 and not provided
		PosStock    *int    `json:"pos_stock"` // Use pointer to distinguish between 0 and not provided
		CategoryID  uint    `json:"category_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.Price > 0 {
		product.Price = req.Price
	}
	if req.Image != "" {
		product.Image = req.Image
	}
	if req.Images != "" {
		product.Images = req.Images
	}
	if req.DisplayType != "" {
		product.DisplayType = req.DisplayType
	}
	if req.SKU != "" {
		product.SKU = req.SKU
	}
	if req.Stock != nil {
		product.Stock = *req.Stock
	}
	if req.PosStock != nil {
		product.PosStock = *req.PosStock
	}
	if req.CategoryID > 0 {
		product.CategoryID = req.CategoryID
	}

	if err := database.DB.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	// Invalidate product cache
	cache.InvalidateProduct(product.ID)

	// Log audit action
	if userID, exists := c.Get("userID"); exists {
		LogAction(userID.(uint), "update", "product", product.ID, gin.H{"name": product.Name}, c)
	} else {
		LogAction(0, "update", "product", product.ID, gin.H{"name": product.Name}, c)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product updated", "product": product})
}

// DeleteProduct deletes a product (admin only)
func DeleteProduct(c *gin.Context) {
	productID := c.Param("id")
	
	var product models.Product
	if err := database.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if err := database.DB.Delete(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	// Invalidate product cache
	cache.InvalidateProduct(product.ID)

	// Log audit action
	if userID, exists := c.Get("userID"); exists {
		LogAction(userID.(uint), "delete", "product", product.ID, gin.H{"name": product.Name}, c)
	} else {
		LogAction(0, "delete", "product", product.ID, gin.H{"name": product.Name}, c)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}

// GetRecentOrders returns recent orders (admin only)
func GetRecentOrders(c *gin.Context) {
	var orders []models.Order
	limit := 10
	if err := database.DB.Preload("User").Preload("Items.Product").
		Order("created_at DESC").Limit(limit).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recent orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// GetTopProducts returns top selling products
func GetTopProducts(c *gin.Context) {
	var topProducts []struct {
		ProductID   uint    `json:"product_id"`
		ProductName string  `json:"product_name"`
		TotalSold   int64   `json:"total_sold"`
		TotalRevenue float64 `json:"total_revenue"`
		Image       string  `json:"image"`
	}

	database.DB.Table("order_items").
		Select("order_items.product_id, products.name as product_name, SUM(order_items.quantity) as total_sold, SUM(order_items.quantity * order_items.price) as total_revenue, products.image").
		Joins("JOIN products ON products.id = order_items.product_id").
		Group("order_items.product_id, products.name, products.image").
		Order("total_sold DESC").
		Limit(5).
		Scan(&topProducts)

	c.JSON(http.StatusOK, gin.H{"products": topProducts})
}

// GetLowStockProducts returns products with low stock
func GetLowStockProducts(c *gin.Context) {
	var products []models.Product
	threshold := 10
	if err := database.DB.Where("stock < ?", threshold).Order("stock ASC").Limit(10).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch low stock products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"products": products})
}

// GetSalesChartData returns sales data over time for chart
func GetSalesChartData(c *gin.Context) {
	days := 30 // Default to last 30 days
	if d := c.Query("days"); d != "" {
		if parsedDays, err := strconv.Atoi(d); err == nil && parsedDays > 0 {
			days = parsedDays
		}
	}

	startDate := time.Now().AddDate(0, 0, -days)
	
	var salesData []struct {
		Date  string  `json:"date"`
		Sales float64 `json:"sales"`
	}

	// Group by date and sum total
	database.DB.Model(&models.Order{}).
		Select("DATE(created_at) as date, COALESCE(SUM(total), 0) as sales").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&salesData)

	c.JSON(http.StatusOK, gin.H{"data": salesData})
}

// GetOrdersChartData returns orders count over time for chart
func GetOrdersChartData(c *gin.Context) {
	days := 30 // Default to last 30 days
	if d := c.Query("days"); d != "" {
		if parsedDays, err := strconv.Atoi(d); err == nil && parsedDays > 0 {
			days = parsedDays
		}
	}

	startDate := time.Now().AddDate(0, 0, -days)
	
	var ordersData []struct {
		Date   string `json:"date"`
		Orders int64  `json:"orders"`
	}

	// Group by date and count orders
	database.DB.Model(&models.Order{}).
		Select("DATE(created_at) as date, COUNT(*) as orders").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&ordersData)

	c.JSON(http.StatusOK, gin.H{"data": ordersData})
}

// GetStatusChartData returns order status distribution for pie chart
func GetStatusChartData(c *gin.Context) {
	var statusData []struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	// Group by status and count
	database.DB.Model(&models.Order{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusData)

	c.JSON(http.StatusOK, gin.H{"data": statusData})
}

// CreateCategory creates a new category (admin only)
func CreateCategory(c *gin.Context) {
	var req struct {
		Name  string `json:"name" binding:"required"`
		Slug  string `json:"slug" binding:"required"`
		Image string `json:"image"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category := models.Category{
		Name:  req.Name,
		Slug:  req.Slug,
		Image: req.Image,
	}

	if err := database.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	// Invalidate category cache
	cache.InvalidateCategory(category.ID)

	c.JSON(http.StatusCreated, gin.H{"message": "Category created", "category": category})
}

// UpdateCategory updates a category (admin only)
func UpdateCategory(c *gin.Context) {
	categoryID := c.Param("id")
	var category models.Category
	if err := database.DB.First(&category, categoryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	var req struct {
		Name  string `json:"name"`
		Slug  string `json:"slug"`
		Image string `json:"image"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Slug != "" {
		category.Slug = req.Slug
	}
	if req.Image != "" {
		category.Image = req.Image
	}

	if err := database.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}

	// Invalidate category cache
	cache.InvalidateCategory(category.ID)

	c.JSON(http.StatusOK, gin.H{"message": "Category updated", "category": category})
}

// DeleteCategory deletes a category (admin only)
func DeleteCategory(c *gin.Context) {
	categoryID := c.Param("id")
	var category models.Category
	if err := database.DB.First(&category, categoryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	if err := database.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	// Invalidate category cache
	cache.InvalidateCategory(category.ID)

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted"})
}

