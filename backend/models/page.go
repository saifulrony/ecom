package models

import (
	"time"

	"gorm.io/gorm"
)

// Page stores custom pages built with the page builder
type Page struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	PageID      string         `json:"page_id" gorm:"unique;not null"` // URL slug (e.g., "landing-page")
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description"`
	Components  string         `json:"components" gorm:"type:jsonb"` // JSON string storing page components
	IsPublished bool           `json:"is_published" gorm:"default:false"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

