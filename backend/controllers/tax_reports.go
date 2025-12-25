package controllers

import (
	"net/http"
	"time"

	"ecom-backend/database"
	"ecom-backend/models"

	"github.com/gin-gonic/gin"
)

// GetTaxReports returns tax reports (admin only)
func GetTaxReports(c *gin.Context) {
	var fromDate, toDate time.Time
	var err error

	// Parse date range
	if from := c.Query("from"); from != "" {
		fromDate, err = time.Parse("2006-01-02", from)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		// Default to last 30 days
		fromDate = time.Now().AddDate(0, 0, -30)
	}

	if to := c.Query("to"); to != "" {
		toDate, err = time.Parse("2006-01-02", to)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format. Use YYYY-MM-DD"})
			return
		}
		// Set to end of day
		toDate = toDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	} else {
		toDate = time.Now()
	}

	// Get orders in date range
	var orders []models.Order
	query := database.DB.Where("created_at >= ? AND created_at <= ?", fromDate, toDate)
	
	if country := c.Query("country"); country != "" {
		query = query.Where("country = ?", country)
	}

	if err := query.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	// Calculate tax statistics
	var totalTax float64
	var totalRevenue float64
	var orderCount int
	taxByCountry := make(map[string]float64)
	taxByMonth := make(map[string]float64)

	for _, order := range orders {
		if order.Tax > 0 {
			totalTax += order.Tax
			totalRevenue += order.Total
			orderCount++

			// Group by country
			taxByCountry[order.Country] += order.Tax

			// Group by month
			monthKey := order.CreatedAt.Format("2006-01")
			taxByMonth[monthKey] += order.Tax
		}
	}

	// Convert maps to slices for JSON
	type TaxByCountry struct {
		Country string  `json:"country"`
		Tax     float64 `json:"tax"`
	}
	type TaxByMonth struct {
		Month string  `json:"month"`
		Tax   float64 `json:"tax"`
	}

	countries := make([]TaxByCountry, 0, len(taxByCountry))
	for country, tax := range taxByCountry {
		countries = append(countries, TaxByCountry{Country: country, Tax: tax})
	}

	months := make([]TaxByMonth, 0, len(taxByMonth))
	for month, tax := range taxByMonth {
		months = append(months, TaxByMonth{Month: month, Tax: tax})
	}

	c.JSON(http.StatusOK, gin.H{
		"period": gin.H{
			"from": fromDate.Format("2006-01-02"),
			"to":   toDate.Format("2006-01-02"),
		},
		"summary": gin.H{
			"total_tax":     totalTax,
			"total_revenue": totalRevenue,
			"order_count":   orderCount,
			"average_tax":   totalTax / float64(max(orderCount, 1)),
		},
		"tax_by_country": countries,
		"tax_by_month":   months,
	})
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

