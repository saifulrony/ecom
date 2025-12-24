package models

import (
	"time"

	"gorm.io/gorm"
)

type ShippingMethod struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null"`
	Description string         `json:"description"`
	Cost        float64        `json:"cost" gorm:"not null"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	EstimatedDays int          `json:"estimated_days" gorm:"default:7"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type ShippingAddress struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null"`
	User      User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	OrderID   uint           `json:"order_id"` // Link to order
	Address   string         `json:"address" gorm:"not null"`
	City      string         `json:"city" gorm:"not null"`
	State     string         `json:"state"`
	PostalCode string        `json:"postal_code" gorm:"not null"`
	Country   string         `json:"country" gorm:"not null"`
	Phone     string         `json:"phone"`
	IsDefault bool           `json:"is_default" gorm:"default:false"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

