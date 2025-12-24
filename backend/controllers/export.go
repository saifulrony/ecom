package controllers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// ExportOrdersCSV exports orders to CSV (admin only)
func ExportOrdersCSV(c *gin.Context) {
	var orders []models.Order
	query := database.DB.Preload("User").Preload("Items.Product").Order("created_at DESC")

	// Filter by date range if provided
	if from := c.Query("from"); from != "" {
		query = query.Where("created_at >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("created_at <= ?", to)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	// Set headers for CSV download
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=orders_%s.csv", time.Now().Format("20060102")))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write header - check error before committing status
	if err := writer.Write([]string{
		"Order ID", "Customer Name", "Customer Email", "Date", "Status",
		"Total", "Address", "City", "Postal Code", "Country", "Items Count",
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV header"})
		return
	}

	// Commit status only after successful header write
	c.Status(http.StatusOK)

	// Write data
	for _, order := range orders {
		if err := writer.Write([]string{
			strconv.Itoa(int(order.ID)),
			order.User.Name,
			order.User.Email,
			order.CreatedAt.Format("2006-01-02 15:04:05"),
			order.Status,
			fmt.Sprintf("%.2f", order.Total),
			order.Address,
			order.City,
			order.PostalCode,
			order.Country,
			strconv.Itoa(len(order.Items)),
		}); err != nil {
			// Note: Status already committed, but we can still log/return error
			// The client will see partial data, which is better than HTTP 200 with error JSON
			return
		}
	}
}

// ExportOrdersPDF exports orders to PDF (admin only) - simplified version
func ExportOrdersPDF(c *gin.Context) {
	var orders []models.Order
	query := database.DB.Preload("User").Preload("Items.Product").Order("created_at DESC")

	// Filter by date range if provided
	if from := c.Query("from"); from != "" {
		query = query.Where("created_at >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("created_at <= ?", to)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	// Generate simple HTML invoice (can be converted to PDF by browser)
	html := "<!DOCTYPE html><html><head><title>Orders Report</title>"
	html += "<style>body{font-family:Arial;margin:20px;}table{border-collapse:collapse;width:100%;}"
	html += "th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;}</style></head><body>"
	html += "<h1>Orders Report</h1><table><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr>"

	for _, order := range orders {
		html += fmt.Sprintf("<tr><td>#%d</td><td>%s</td><td>%s</td><td>%s</td><td>৳%.2f</td></tr>",
			order.ID, order.User.Name, order.CreatedAt.Format("2006-01-02"), order.Status, order.Total)
	}

	html += "</table></body></html>"

	c.Header("Content-Type", "text/html")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=orders_%s.html", time.Now().Format("20060102")))
	c.String(http.StatusOK, html)
}

// GenerateInvoice generates an invoice for an order (admin only)
func GenerateInvoice(c *gin.Context) {
	orderID := c.Param("id")
	var order models.Order

	if err := database.DB.Preload("User").Preload("Items.Product").
		First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Generate HTML invoice
	html := "<!DOCTYPE html><html><head><title>Invoice #" + strconv.Itoa(int(order.ID)) + "</title>"
	html += "<style>body{font-family:Arial;margin:40px;max-width:800px;}h1{color:#333;}"
	html += "table{border-collapse:collapse;width:100%;margin:20px 0;}th,td{border:1px solid #ddd;padding:12px;}"
	html += "th{background-color:#f2f2f2;}.total{font-size:18px;font-weight:bold;text-align:right;}"
	html += ".header{display:flex;justify-content:space-between;margin-bottom:30px;}</style></head><body>"

	html += "<div class='header'><div><h1>INVOICE</h1><p>Order #" + strconv.Itoa(int(order.ID)) + "</p></div>"
	html += "<div><p><strong>Date:</strong> " + order.CreatedAt.Format("January 2, 2006") + "</p></div></div>"

	html += "<div><h3>Bill To:</h3><p>" + order.User.Name + "<br>" + order.User.Email + "</p></div>"

	html += "<div><h3>Shipping Address:</h3><p>" + order.Address + "<br>" + order.City + ", " + order.PostalCode + "<br>" + order.Country + "</p></div>"

	html += "<table><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Total</th></tr>"
	for _, item := range order.Items {
		html += fmt.Sprintf("<tr><td>%s</td><td>%d</td><td>৳%.2f</td><td>৳%.2f</td></tr>",
			item.Product.Name, item.Quantity, item.Price, item.Price*float64(item.Quantity))
	}
	html += "</table>"

	html += "<div class='total'><p>Total: ৳" + fmt.Sprintf("%.2f", order.Total) + "</p></div>"
	html += "<p style='margin-top:40px;'><strong>Status:</strong> " + order.Status + "</p>"
	html += "</body></html>"

	c.Header("Content-Type", "text/html")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=invoice_%d.html", order.ID))
	c.String(http.StatusOK, html)
}

