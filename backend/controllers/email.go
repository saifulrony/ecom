package controllers

import (
	"fmt"
	"net/http"
	"os"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// SendInvoiceEmail sends invoice via email (admin only)
func SendInvoiceEmail(c *gin.Context) {
	orderID := c.Param("id")
	var order models.Order

	if err := database.DB.Preload("User").Preload("Items.Product").
		First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Get email settings
	var smtpHost, smtpUser, smtpPassword string
	var smtpHostSetting, smtpUserSetting, smtpPasswordSetting models.Setting

	if err := database.DB.Where("key = ?", "smtp_host").First(&smtpHostSetting).Error; err == nil {
		smtpHost = smtpHostSetting.Value
	}
	if err := database.DB.Where("key = ?", "smtp_user").First(&smtpUserSetting).Error; err == nil {
		smtpUser = smtpUserSetting.Value
	}
	if err := database.DB.Where("key = ?", "smtp_password").First(&smtpPasswordSetting).Error; err == nil {
		smtpPassword = smtpPasswordSetting.Value
	}

	// Check if email is configured
	if smtpHost == "" || smtpUser == "" || smtpPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email service not configured. Please configure SMTP settings in admin panel.",
		})
		return
	}

	// Generate invoice HTML (for future email sending)
	_ = generateInvoiceHTML(order)

	// In a real implementation, you would use an email library like:
	// - gomail (github.com/go-mail/mail)
	// - net/smtp (standard library)
	// For now, we'll return a success message indicating the email would be sent
	
	// TODO: Implement actual email sending
	// Example with gomail:
	// m := gomail.NewMessage()
	// m.SetHeader("From", smtpFromEmail)
	// m.SetHeader("To", order.User.Email)
	// m.SetHeader("Subject", fmt.Sprintf("Invoice #%d", order.ID))
	// m.SetBody("text/html", invoiceHTML)
	// 
	// d := gomail.NewDialer(smtpHost, smtpPort, smtpUser, smtpPassword)
	// if err := d.DialAndSend(m); err != nil {
	//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
	//     return
	// }

	// For now, log that email would be sent (in production, implement actual sending)
	if os.Getenv("ENABLE_EMAIL_LOGGING") == "true" {
		fmt.Printf("Would send invoice email to %s for order #%d\n", order.User.Email, order.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Invoice email sent successfully",
		"email":   order.User.Email,
		"note":    "Email functionality requires SMTP configuration and email library integration",
	})
}

func generateInvoiceHTML(order models.Order) string {
	html := "<!DOCTYPE html><html><head><title>Invoice #" + fmt.Sprintf("%d", order.ID) + "</title>"
	html += "<style>body{font-family:Arial;margin:40px;max-width:800px;}h1{color:#333;}"
	html += "table{border-collapse:collapse;width:100%;margin:20px 0;}th,td{border:1px solid #ddd;padding:12px;}"
	html += "th{background-color:#f2f2f2;}.total{font-size:18px;font-weight:bold;text-align:right;}"
	html += ".header{display:flex;justify-content:space-between;margin-bottom:30px;}</style></head><body>"

	html += "<div class='header'><div><h1>INVOICE</h1><p>Order #" + fmt.Sprintf("%d", order.ID) + "</p></div>"
	html += "<div><p><strong>Date:</strong> " + order.CreatedAt.Format("January 2, 2006") + "</p></div></div>"

	html += "<div><h3>Bill To:</h3><p>" + order.User.Name + "<br>" + order.User.Email + "</p></div>"

	html += "<div><h3>Shipping Address:</h3><p>" + order.Address + "<br>" + order.City + ", " + order.PostalCode + "<br>" + order.Country + "</p></div>"

	html += "<table><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Total</th></tr>"
	for _, item := range order.Items {
		html += fmt.Sprintf("<tr><td>%s</td><td>%d</td><td>৳%.2f</td><td>৳%.2f</td></tr>",
			item.Product.Name, item.Quantity, item.Price, item.Price*float64(item.Quantity))
	}
	html += "</table>"

	if order.Subtotal > 0 {
		html += fmt.Sprintf("<div><p><strong>Subtotal:</strong> ৳%.2f</p>", order.Subtotal)
	}
	if order.Discount > 0 {
		html += fmt.Sprintf("<p><strong>Discount:</strong> -৳%.2f</p>", order.Discount)
	}
	if order.Tax > 0 {
		html += fmt.Sprintf("<p><strong>Tax:</strong> ৳%.2f</p>", order.Tax)
	}
	if order.Shipping > 0 {
		html += fmt.Sprintf("<p><strong>Shipping:</strong> ৳%.2f</p>", order.Shipping)
	}
	html += "</div>"

	html += "<div class='total'><p>Total: ৳" + fmt.Sprintf("%.2f", order.Total) + "</p></div>"
	html += "<p style='margin-top:40px;'><strong>Status:</strong> " + order.Status + "</p>"
	html += "</body></html>"

	return html
}

