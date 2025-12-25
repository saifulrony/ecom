package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"ecom-backend/config"
	"ecom-backend/database"
	"ecom-backend/models"
	"ecom-backend/utils"

	"github.com/gin-gonic/gin"
)

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Role:     "user",
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate token
	cfg := config.LoadConfig()
	token, err := utils.GenerateToken(user.ID, user.Email, user.Role, cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"token":   token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Check password
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate token
	cfg := config.LoadConfig()
	token, err := utils.GenerateToken(user.ID, user.Email, user.Role, cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role, // Include role in response
		},
	})
}

func GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Log the image value for debugging
	fmt.Printf("GetProfile: User image from DB: %s\n", user.Image)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":          user.ID,
			"email":       user.Email,
			"name":        user.Name,
			"image":       user.Image,
			"phone":       user.Phone,
			"address":     user.Address,
			"city":        user.City,
			"postal_code": user.PostalCode,
			"country":     user.Country,
			"role":        user.Role,
		},
	})
}

func UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Handle multipart/form-data (for image upload)
	// Check Content-Type header for multipart/form-data
	contentType := c.GetHeader("Content-Type")
	hasMultipart := false
	if contentType != "" {
		// Content-Type will be like "multipart/form-data; boundary=..."
		hasMultipart = len(contentType) >= 19 && contentType[:19] == "multipart/form-data"
	}
	
	if hasMultipart {
		// Handle image upload (if provided)
		file, fileErr := c.FormFile("image")
		if fileErr == nil && file != nil {
			// Validate file type
			ext := filepath.Ext(file.Filename)
			allowedExts := []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
			allowed := false
			for _, allowedExt := range allowedExts {
				if ext == allowedExt {
					allowed = true
					break
				}
			}
			if !allowed {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only images are allowed."})
				return
			}

			// Create uploads directory if it doesn't exist
			uploadsDir := "./uploads"
			if err := os.MkdirAll(uploadsDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
				return
			}

			// Generate unique filename
			filename := fmt.Sprintf("profile_%d_%d%s", user.ID, time.Now().Unix(), ext)
			fullPath := filepath.Join(uploadsDir, filename)

			// Delete old image if exists
			if user.Image != "" {
				oldPath := filepath.Join(uploadsDir, filepath.Base(user.Image))
				if err := os.Remove(oldPath); err != nil {
					// Log error but don't fail - old file might not exist
					fmt.Printf("Warning: Failed to delete old image: %v\n", err)
				}
			}

			// Save new image
			if err := c.SaveUploadedFile(file, fullPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
				return
			}

			// Update user image URL
			user.Image = fmt.Sprintf("/uploads/%s", filename)
		}

		// Handle other form fields
		if name := c.PostForm("name"); name != "" {
			user.Name = name
		}
		if email := c.PostForm("email"); email != "" && email != user.Email {
			var existingUser models.User
			if err := database.DB.Where("email = ?", email).First(&existingUser).Error; err == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
				return
			}
			user.Email = email
		}
		if phone := c.PostForm("phone"); phone != "" {
			user.Phone = phone
		}
		if address := c.PostForm("address"); address != "" {
			user.Address = address
		}
		if city := c.PostForm("city"); city != "" {
			user.City = city
		}
		if postalCode := c.PostForm("postal_code"); postalCode != "" {
			user.PostalCode = postalCode
		}
		if country := c.PostForm("country"); country != "" {
			user.Country = country
		}
	} else {
		// Handle JSON request (backward compatibility)
	var req struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		Phone      string `json:"phone"`
		Address    string `json:"address"`
		City       string `json:"city"`
		PostalCode string `json:"postal_code"`
		Country    string `json:"country"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email is being changed and if it already exists
	if req.Email != "" && req.Email != user.Email {
		var existingUser models.User
		if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}
		user.Email = req.Email
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Address != "" {
		user.Address = req.Address
	}
	if req.City != "" {
		user.City = req.City
	}
	if req.PostalCode != "" {
		user.PostalCode = req.PostalCode
	}
	if req.Country != "" {
		user.Country = req.Country
		}
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Log the image value for debugging
	fmt.Printf("UpdateProfile: Saved user image: %s\n", user.Image)

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user": gin.H{
			"id":          user.ID,
			"email":       user.Email,
			"name":        user.Name,
			"image":       user.Image,
			"phone":       user.Phone,
			"address":     user.Address,
			"city":        user.City,
			"postal_code": user.PostalCode,
			"country":     user.Country,
			"role":        user.Role,
		},
	})
}

func ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Verify current password
	if !utils.CheckPasswordHash(req.CurrentPassword, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	user.Password = hashedPassword
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
