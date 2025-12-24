package models

import (
	"time"

	"gorm.io/gorm"
)

type Review struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	ProductID uint           `json:"product_id" gorm:"not null"`
	Product   Product        `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	UserID    uint           `json:"user_id" gorm:"not null"`
	User      User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	OrderID   uint           `json:"order_id"` // Link to order (optional)
	Rating    int            `json:"rating" gorm:"not null;check:rating >= 1 AND rating <= 5"`
	Title     string         `json:"title"`
	Comment   string         `json:"comment"`
	IsApproved bool          `json:"is_approved" gorm:"default:false"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

