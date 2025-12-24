package models

import (
	"time"

	"gorm.io/gorm"
)

// ProductVariation represents a variation type (e.g., Color, Size, Material)
type ProductVariation struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	ProductID   uint           `json:"product_id" gorm:"not null"`
	Product     Product        `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Name        string         `json:"name" gorm:"not null"` // e.g., "Color", "Size", "Material"
	IsRequired  bool           `json:"is_required" gorm:"default:true"`
	AllowCustom bool           `json:"allow_custom" gorm:"default:false"` // Allow users to enter custom value
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Options     []VariationOption `json:"options,omitempty" gorm:"foreignKey:VariationID"`
}

// VariationOption represents an option for a variation (e.g., "Red", "Blue" for Color)
type VariationOption struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	VariationID uint           `json:"variation_id" gorm:"not null"`
	Variation   ProductVariation `json:"variation,omitempty" gorm:"foreignKey:VariationID"`
	Value       string         `json:"value" gorm:"not null"` // e.g., "Red", "Large", "Cotton"
	PriceModifier float64      `json:"price_modifier" gorm:"default:0"` // Additional price for this option
	Stock       int            `json:"stock" gorm:"default:0"` // Stock for this specific variation option
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

