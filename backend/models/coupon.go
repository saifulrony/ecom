package models

import (
	"time"

	"gorm.io/gorm"
)

type Coupon struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Code        string         `json:"code" gorm:"unique;not null"`
	Type        string         `json:"type" gorm:"not null"` // "percentage" or "fixed"
	Value       float64        `json:"value" gorm:"not null"`
	MinPurchase float64        `json:"min_purchase"`
	MaxDiscount float64        `json:"max_discount"`
	UsageLimit  int            `json:"usage_limit"`
	UsedCount   int            `json:"used_count" gorm:"default:0"`
	ValidFrom   time.Time      `json:"valid_from" gorm:"not null"`
	ValidUntil  time.Time      `json:"valid_until" gorm:"not null"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

