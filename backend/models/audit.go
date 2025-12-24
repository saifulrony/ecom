package models

import (
	"time"

	"gorm.io/gorm"
)

type AuditLog struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      uint           `json:"user_id"` // Nullable for system actions
	User        User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Action      string         `json:"action" gorm:"not null"` // create, update, delete, login, etc.
	EntityType  string         `json:"entity_type"` // product, order, user, etc.
	EntityID    uint           `json:"entity_id"`
	Changes     string         `json:"changes" gorm:"type:text"` // JSON string of changes
	IPAddress   string         `json:"ip_address"`
	UserAgent   string         `json:"user_agent"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

