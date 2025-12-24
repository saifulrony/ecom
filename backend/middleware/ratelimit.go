package middleware

import (
	"ecom-backend/cache"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimitMiddleware limits requests per IP address
func RateLimitMiddleware(requestsPerMinute int) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting if Redis is not available
		if cache.Client == nil {
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := "rate_limit:" + ip

		// Increment request count
		count, err := cache.Increment(key)
		if err != nil {
			// If Redis fails, allow request
			c.Next()
			return
		}

		// Set expiration on first request
		if count == 1 {
			cache.Set(key, "1", time.Minute)
		}

		// Check if limit exceeded
		if count > int64(requestsPerMinute) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		// Add remaining requests to header
		remaining := requestsPerMinute - int(count)
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerMinute))

		c.Next()
	}
}

