package models

import (
	"time"

	"gorm.io/gorm"
)

type TaxRate struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Country   string         `json:"country" gorm:"not null"`
	Region    string         `json:"region"` // State/Province, optional
	City      string         `json:"city"`   // City, optional
	Rate      float64        `json:"rate" gorm:"not null"` // Tax rate as percentage
	IsDefault bool           `json:"is_default" gorm:"default:false"` // Default rate if no match found
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

