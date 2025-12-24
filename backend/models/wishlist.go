package models

import (
	"time"

	"gorm.io/gorm"
)

type Wishlist struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;uniqueIndex:idx_user_product"`
	User      User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	ProductID uint           `json:"product_id" gorm:"not null;uniqueIndex:idx_user_product"`
	Product   Product        `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

