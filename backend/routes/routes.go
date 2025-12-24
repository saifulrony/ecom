package routes

import (
	"ecom-backend/controllers"
	"ecom-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

func SetupRoutes() *gin.Engine {
	r := gin.Default()

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:10001",
		"http://192.168.10.203:10001",
		"http://127.0.0.1:10001",
	}
	config.AllowCredentials = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// Rate limiting middleware (100 requests per minute per IP)
	r.Use(middleware.RateLimitMiddleware(100))

	// Root route
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "E-commerce API",
			"version": "1.0.0",
			"endpoints": gin.H{
				"health": "/health",
				"products": "/api/products",
				"categories": "/api/categories",
				"auth": gin.H{
					"register": "/api/auth/register",
					"login": "/api/auth/login",
				},
			},
		})
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Public routes
	api := r.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", controllers.Register)
			auth.POST("/login", controllers.Login)
		}

		// Product routes
		products := api.Group("/products")
		{
			products.GET("", controllers.GetProducts)
			products.GET("/:id", controllers.GetProduct)
			products.GET("/:id/variations", controllers.GetProductVariations)
		}

		// Category routes
		api.GET("/categories", controllers.GetCategories)
	}

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// Profile
		protected.GET("/auth/profile", controllers.GetProfile)
		protected.PUT("/auth/profile", controllers.UpdateProfile)
		protected.PUT("/auth/change-password", controllers.ChangePassword)

		// Cart routes
		cart := protected.Group("/cart")
		{
			cart.GET("", controllers.GetCart)
			cart.POST("", controllers.AddToCart)
			cart.PUT("/:id", controllers.UpdateCartItem)
			cart.DELETE("/:id", controllers.RemoveFromCart)
			cart.DELETE("", controllers.ClearCart)
		}

		// Order routes
		orders := protected.Group("/orders")
		{
			orders.POST("", controllers.CreateOrder)
			orders.GET("", controllers.GetOrders)
			orders.GET("/:id", controllers.GetOrder)
		}

		// Reviews
		protected.POST("/products/:id/reviews", controllers.CreateReview)

		// Refunds
		protected.GET("/refunds", controllers.GetRefunds)
		protected.POST("/refunds", controllers.CreateRefundRequest)

		// Wishlist routes
		wishlist := protected.Group("/wishlist")
		{
			wishlist.GET("", controllers.GetWishlist)
			wishlist.POST("", controllers.AddToWishlist)
			wishlist.DELETE("/:product_id", controllers.RemoveFromWishlist)
			wishlist.GET("/check/:product_id", controllers.CheckWishlist)
		}
	}

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(middleware.AdminMiddleware())
	{
		// Dashboard
		admin.GET("/dashboard/stats", controllers.AdminDashboardStats)
		admin.GET("/dashboard/recent-orders", controllers.GetRecentOrders)
		admin.GET("/dashboard/top-products", controllers.GetTopProducts)
		admin.GET("/dashboard/low-stock", controllers.GetLowStockProducts)
		admin.GET("/dashboard/sales-chart", controllers.GetSalesChartData)
		admin.GET("/dashboard/orders-chart", controllers.GetOrdersChartData)
		admin.GET("/dashboard/status-chart", controllers.GetStatusChartData)

		// Users management
		admin.GET("/users", controllers.GetUsers)
		admin.GET("/customers", controllers.GetCustomers)

		// Orders management
		admin.GET("/orders", controllers.GetAllOrders)
		admin.PUT("/orders/:id/status", controllers.UpdateOrderStatus)

		// POS system
		// POS routes
		admin.POST("/pos/order", controllers.CreatePOSOrder)
		admin.GET("/pos/orders", controllers.GetPOSOrders)
		admin.GET("/pos/orders/:id", controllers.GetPOSOrder)

		// Products management
		admin.POST("/products", controllers.CreateProduct)
		admin.PUT("/products/:id", controllers.UpdateProduct)
		admin.DELETE("/products/:id", controllers.DeleteProduct)

		// Categories management
		admin.POST("/categories", controllers.CreateCategory)
		admin.PUT("/categories/:id", controllers.UpdateCategory)
		admin.DELETE("/categories/:id", controllers.DeleteCategory)

		// Coupons management
		admin.GET("/coupons", controllers.GetCoupons)
		admin.POST("/coupons", controllers.CreateCoupon)
		admin.PUT("/coupons/:id", controllers.UpdateCoupon)
		admin.DELETE("/coupons/:id", controllers.DeleteCoupon)

		// Campaigns management
		admin.GET("/campaigns", controllers.GetCampaigns)
		admin.GET("/campaigns/:id", controllers.GetCampaign)
		admin.POST("/campaigns", controllers.CreateCampaign)
		admin.PUT("/campaigns/:id", controllers.UpdateCampaign)
		admin.DELETE("/campaigns/:id", controllers.DeleteCampaign)
		admin.GET("/campaigns/:id/stats", controllers.GetCampaignStats)

		// Inventory management
		admin.PUT("/products/:id/stock", controllers.AdjustStock)

		// Product variations management
		admin.GET("/products/:id/variations", controllers.GetProductVariations)
		admin.POST("/products/:id/variations", controllers.CreateProductVariation)
		admin.PUT("/variations/:id", controllers.UpdateProductVariation)
		admin.DELETE("/variations/:id", controllers.DeleteProductVariation)
		admin.POST("/variations/:id/options", controllers.CreateVariationOption)
		admin.PUT("/variations/:id/options/:option_id", controllers.UpdateVariationOption)
		admin.DELETE("/variations/:id/options/:option_id", controllers.DeleteVariationOption)

		// Settings management
		admin.GET("/settings", controllers.GetSettings)
		admin.GET("/settings/:key", controllers.GetSetting)
		admin.PUT("/settings", controllers.UpdateSettings)

		// Notifications management
		admin.GET("/notifications", controllers.GetNotifications)
		admin.POST("/notifications", controllers.CreateNotification)
		admin.PUT("/notifications/:id/read", controllers.MarkNotificationAsRead)
		admin.PUT("/notifications/read-all", controllers.MarkAllNotificationsAsRead)
		admin.DELETE("/notifications/:id", controllers.DeleteNotification)

		// Export functionality
		admin.GET("/orders/export/csv", controllers.ExportOrdersCSV)
		admin.GET("/orders/export/pdf", controllers.ExportOrdersPDF)
		admin.GET("/orders/:id/invoice", controllers.GenerateInvoice)

		// Bulk operations
		admin.POST("/products/bulk-delete", controllers.BulkDeleteProducts)
		admin.PUT("/products/bulk-update", controllers.BulkUpdateProductStatus)
		admin.PUT("/orders/bulk-update", controllers.BulkUpdateOrderStatus)

		// Reviews management
		admin.GET("/reviews", controllers.GetReviews)
		admin.PUT("/reviews/:id/approve", controllers.ApproveReview)
		admin.DELETE("/reviews/:id", controllers.DeleteReview)

		// Shipping management
		admin.GET("/shipping-methods", controllers.GetAllShippingMethods)
		admin.POST("/shipping-methods", controllers.CreateShippingMethod)
		admin.PUT("/shipping-methods/:id", controllers.UpdateShippingMethod)
		admin.DELETE("/shipping-methods/:id", controllers.DeleteShippingMethod)

		// Refund management
		admin.GET("/refunds", controllers.GetAllRefunds)
		admin.PUT("/refunds/:id/status", controllers.UpdateRefundStatus)

		// Audit logs
		admin.GET("/audit-logs", controllers.GetAuditLogs)

		// Import/Export
		admin.GET("/products/export/csv", controllers.ExportProductsCSV)
		admin.POST("/products/import/csv", controllers.ImportProductsCSV)

		// File upload
		admin.POST("/upload/image", controllers.UploadImage)
		admin.POST("/upload/file", controllers.UploadFile)
	}

	return r
}

