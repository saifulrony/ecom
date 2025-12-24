package models

import (
	"time"

	"gorm.io/gorm"
)

type Refund struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	OrderID     uint           `json:"order_id" gorm:"not null"`
	Order       Order          `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	OrderItemID uint           `json:"order_item_id"` // Optional: refund specific item
	Amount      float64        `json:"amount" gorm:"not null"`
	Reason      string         `json:"reason" gorm:"not null"`
	Status      string         `json:"status" gorm:"default:pending"` // pending, approved, rejected, processed
	ProcessedBy uint           `json:"processed_by"` // Admin user ID
	ProcessedAt *time.Time     `json:"processed_at"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

