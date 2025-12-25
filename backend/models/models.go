package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	Email      string         `json:"email" gorm:"unique;not null"`
	Password   string         `json:"-" gorm:"not null"`
	Name       string         `json:"name" gorm:"not null"`
	Image      string         `json:"image"` // Profile image URL
	Phone      string         `json:"phone"`
	Address    string         `json:"address"`
	City       string         `json:"city"`
	PostalCode string         `json:"postal_code"`
	Country    string         `json:"country"`
	Role       string         `json:"role" gorm:"default:user"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
	Orders     []Order        `json:"orders,omitempty"`
}

type Category struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"unique;not null"`
	Slug      string         `json:"slug" gorm:"unique;not null"`
	Image     string         `json:"image"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	Products  []Product      `json:"products,omitempty"`
}

type Product struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null"`
	Description string         `json:"description"`
	Price       float64        `json:"price" gorm:"not null"`
	Image       string         `json:"image"`
	Images      string         `json:"images" gorm:"type:text"` // JSON array of image URLs for gallery
	DisplayType string         `json:"display_type" gorm:"default:single"` // single, slider, gallery
	SKU         string         `json:"sku" gorm:"unique"` // Stock Keeping Unit
	Stock       int            `json:"stock" gorm:"default:0"` // Website stock
	PosStock    int            `json:"pos_stock" gorm:"default:0"` // POS/Showroom stock
	CategoryID  uint           `json:"category_id"`
	Category    Category       `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Variations  []ProductVariation `json:"variations,omitempty" gorm:"foreignKey:ProductID"`
	Reviews     []Review       `json:"reviews,omitempty" gorm:"foreignKey:ProductID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Cart struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null"`
	User      User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	ProductID uint           `json:"product_id" gorm:"not null"`
	Product   Product        `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity  int            `json:"quantity" gorm:"default:1"`
	Variations string        `json:"variations" gorm:"type:jsonb"` // JSON string storing variation selections
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Order struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID     uint           `json:"user_id" gorm:"not null"`
	User       User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Subtotal   float64        `json:"subtotal" gorm:"default:0"` // Subtotal before tax and discount
	Tax        float64        `json:"tax" gorm:"default:0"` // Tax amount
	Discount   float64        `json:"discount" gorm:"default:0"` // Discount amount
	Shipping   float64        `json:"shipping" gorm:"default:0"` // Shipping cost
	Total      float64        `json:"total" gorm:"not null"`
	Status     string         `json:"status" gorm:"default:pending"`
	Address    string         `json:"address" gorm:"not null"`
	City       string         `json:"city" gorm:"not null"`
	PostalCode string         `json:"postal_code" gorm:"not null"`
	Country    string         `json:"country" gorm:"not null"`
	TaxRate    float64        `json:"tax_rate" gorm:"default:0"` // Tax rate used for this order
	IsPOS      bool           `json:"is_pos" gorm:"default:false"` // Mark POS orders
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
	Items      []OrderItem    `json:"items,omitempty"`
	Payments   []Payment      `json:"payments,omitempty" gorm:"foreignKey:OrderID"`
}

type Payment struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	OrderID       uint           `json:"order_id" gorm:"not null"`
	Order         Order          `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	Method        string         `json:"method" gorm:"not null"` // cash, card, mobile, etc.
	Amount        float64        `json:"amount" gorm:"not null"`
	Reference     string         `json:"reference"` // Transaction reference, receipt number, etc.
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

type OrderItem struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	OrderID   uint           `json:"order_id" gorm:"not null"`
	Order     Order          `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	ProductID uint           `json:"product_id" gorm:"not null"`
	Product   Product        `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity  int            `json:"quantity" gorm:"not null"`
	Price     float64        `json:"price" gorm:"not null"`
	Variations string        `json:"variations" gorm:"type:jsonb"` // JSON string storing variation selections
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Campaign struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"not null"`
	Code          string         `json:"code" gorm:"unique;not null"` // Unique campaign code
	Description   string         `json:"description"`
	StartDate     time.Time      `json:"start_date" gorm:"not null"`
	EndDate       time.Time      `json:"end_date" gorm:"not null"`
	IsActive      bool           `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

type Chat struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	UserID          *uint          `json:"user_id"` // Optional - can be null for anonymous users
	User            *User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	GuestName       string         `json:"guest_name"` // Name for anonymous/guest users
	GuestEmail      string         `json:"guest_email"` // Email for anonymous/guest users (for follow-up)
	IPAddress       string         `json:"ip_address"` // Store IP for anonymous users (fallback when localStorage is cleared)
	Status          string         `json:"status" gorm:"default:active"` // active, resolved, pending
	SupportStaffID  *uint          `json:"support_staff_id"` // Assigned support staff
	SupportStaff    *User          `json:"support_staff,omitempty" gorm:"foreignKey:SupportStaffID"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
	Messages        []ChatMessage  `json:"messages,omitempty" gorm:"foreignKey:ChatID"`
}

type ChatMessage struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	ChatID     uint           `json:"chat_id" gorm:"not null"`
	Chat       Chat           `json:"chat,omitempty" gorm:"foreignKey:ChatID"`
	Sender     string         `json:"sender" gorm:"not null"` // "user", "ai", or "admin"
	AdminUserID *uint         `json:"admin_user_id"` // Optional: ID of admin user who sent the message (only for sender="admin")
	AdminUser   *User         `json:"admin_user,omitempty" gorm:"foreignKey:AdminUserID"` // Admin user who sent this message
	Message    string         `json:"message" gorm:"not null"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

