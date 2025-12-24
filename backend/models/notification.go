package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Type      string         `json:"type" gorm:"not null"` // "order", "stock", "system", "info"
	Title     string         `json:"title" gorm:"not null"`
	Message   string         `json:"message" gorm:"not null"`
	Read      bool           `json:"read" gorm:"default:false"`
	UserID    uint           `json:"user_id"` // If null, it's a system-wide notification
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

