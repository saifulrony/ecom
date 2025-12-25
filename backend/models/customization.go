package models

import (
	"time"

	"gorm.io/gorm"
)

// ThemeCustomization stores all theme customization settings
type ThemeCustomization struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Key       string         `json:"key" gorm:"unique;not null"` // e.g., "header", "footer", "body", "slider"
	Settings  string         `json:"settings" gorm:"type:jsonb"`   // JSON string storing all settings
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

