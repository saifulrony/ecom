package models

import (
	"time"

	"gorm.io/gorm"
)

type Setting struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Key       string         `json:"key" gorm:"unique;not null"`
	Value     string         `json:"value"`
	Type      string         `json:"type"` // "string", "number", "boolean", "json"
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

