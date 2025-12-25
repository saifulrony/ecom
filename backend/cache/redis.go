package cache

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var Client *redis.Client
var ctx = context.Background()

// Connect initializes Redis connection
func Connect(redisHost, redisPort, redisPassword string) {
	addr := fmt.Sprintf("%s:%s", redisHost, redisPort)
	redisDB := 0 // Default DB

	Client = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: redisPassword,
		DB:       redisDB,
	})

	// Test connection
	_, err := Client.Ping(ctx).Result()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v. Application will continue without caching.", err)
		Client = nil // Set to nil so we can check if Redis is available
		return
	}

	log.Println("✅ Redis connected successfully")
}

// Get retrieves a value from cache
func Get(key string) (string, error) {
	if Client == nil {
		return "", fmt.Errorf("redis not available")
	}
	return Client.Get(ctx, key).Result()
}

// Set stores a value in cache with expiration
func Set(key string, value interface{}, expiration time.Duration) error {
	if Client == nil {
		return fmt.Errorf("redis not available")
	}
	return Client.Set(ctx, key, value, expiration).Err()
}

// Delete removes a key from cache
func Delete(key string) error {
	if Client == nil {
		return fmt.Errorf("redis not available")
	}
	return Client.Del(ctx, key).Err()
}

// DeletePattern removes all keys matching a pattern
func DeletePattern(pattern string) error {
	if Client == nil {
		return fmt.Errorf("redis not available")
	}
	
	iter := Client.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		if err := Client.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}

// Exists checks if a key exists in cache
func Exists(key string) bool {
	if Client == nil {
		return false
	}
	result, err := Client.Exists(ctx, key).Result()
	return err == nil && result > 0
}

// Increment increments a key's value (useful for rate limiting)
func Increment(key string) (int64, error) {
	if Client == nil {
		return 0, fmt.Errorf("redis not available")
	}
	return Client.Incr(ctx, key).Result()
}

// SetNX sets a key only if it doesn't exist (useful for locks)
func SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	if Client == nil {
		return false, fmt.Errorf("redis not available")
	}
	return Client.SetNX(ctx, key, value, expiration).Result()
}

// GetInt gets an integer value from cache
func GetInt(key string) (int64, error) {
	if Client == nil {
		return 0, fmt.Errorf("redis not available")
	}
	return Client.Get(ctx, key).Int64()
}

// GetTTL gets the time-to-live (TTL) of a key
func GetTTL(key string) (time.Duration, error) {
	if Client == nil {
		return 0, fmt.Errorf("redis not available")
	}
	return Client.TTL(ctx, key).Result()
}

// Helper function to get environment variables
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value != "" {
		return value
	}
	return defaultValue
}

