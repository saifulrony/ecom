# Ecommerce Platform

A modern, full-stack ecommerce platform built with **Go (Gin)** backend and **Next.js** frontend.

## 🚀 Features

- **User Authentication** - Register, login, and JWT-based authentication
- **Product Catalog** - Browse products with search, filtering, and pagination
- **Shopping Cart** - Add, update, and remove items from cart
- **Order Management** - Create orders and view order history
- **Responsive Design** - Beautiful, modern UI that works on all devices
- **Real-time Updates** - Stock management and inventory tracking

## 🛠️ Tech Stack

### Backend
- **Go 1.21+** - Programming language
- **Gin** - Web framework
- **GORM** - ORM for database operations
- **PostgreSQL** - Database
- **Redis** - Caching and rate limiting (optional)
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client

## 📋 Prerequisites

- Go 1.21 or higher
- Node.js 18+ and npm/yarn
- PostgreSQL 12+ (must be running)
- Redis (optional, for caching and rate limiting)
- Git
- Sudo access (for database setup)

### Redis Setup (Optional but Recommended)

Redis is used for caching products/categories and rate limiting (100 requests/minute per IP). The app works without Redis but performs better with it.

1. **Install Redis**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # macOS (using Homebrew)
   brew install redis
   ```

2. **Start Redis**:
   ```bash
   # Ubuntu/Debian
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   
   # macOS
   brew services start redis
   
   # Or run directly
   redis-server
   ```

3. **Verify Redis is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

If Redis is not running, the application will log a warning and continue without caching.

### Database Setup (Required First Step)

Before running the application, ensure PostgreSQL is set up:

```bash
# 1. Start PostgreSQL
sudo systemctl start postgresql

# 2. Create database
sudo -u postgres psql -c "CREATE DATABASE ecom_db;"

# 3. Set password (if needed)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Or use the helper script:
./fix-db.sh
```

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions.

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ecom
```

### Quick Start (Recommended)

Use the development script to start both backend and frontend:

```bash
# Linux/macOS
./dev.sh

# Windows
dev.bat
```

This will:
- ✅ Check prerequisites
- ✅ Create .env files if missing
- ✅ Install dependencies
- ✅ Start both servers
- ✅ Show server URLs

Press `Ctrl+C` to stop all servers.

### 2. Manual Setup

#### Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_NAME=ecom_db
# DB_PORT=5432
# JWT_SECRET=your-secret-key
# PORT=10000

# Install dependencies
go mod download

# Run the server
go run main.go
```

The backend will start on `http://localhost:10000`

### 3. Database Setup

Make sure PostgreSQL is running and create the database:

```sql
CREATE DATABASE ecom_db;
```

The application will automatically:
- Create all necessary tables
- Seed sample categories and products

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local (if needed)
# NEXT_PUBLIC_API_URL=http://localhost:10000/api

# Run the development server
npm run dev
# or
yarn dev
```

The frontend will start on `http://localhost:10001`

## 📁 Project Structure

```
ecom/
├── backend/
│   ├── config/          # Configuration
│   ├── controllers/      # Request handlers
│   ├── database/        # Database connection & migrations
│   ├── middleware/      # Auth middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── main.go          # Entry point
│   └── go.mod           # Go dependencies
│
└── frontend/
    ├── app/             # Next.js app directory
    │   ├── products/    # Product pages
    │   ├── cart/        # Cart page
    │   ├── checkout/    # Checkout page
    │   ├── orders/      # Order pages
    │   ├── login/       # Login page
    │   └── register/    # Register page
    ├── components/      # React components
    ├── lib/             # API client
    ├── store/           # State management
    └── package.json     # Node dependencies
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Products
- `GET /api/products` - Get all products (with pagination, search, filter)
- `GET /api/products/:id` - Get product by ID
- `GET /api/categories` - Get all categories

### Cart (Protected)
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item quantity
- `DELETE /api/cart/:id` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Orders (Protected)
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order by ID

## 🎨 Features Overview

### Home Page
- Hero section with call-to-action
- Featured products grid
- Service highlights

### Products Page
- Product listing with pagination
- Search functionality
- Category filtering
- Responsive grid layout

### Product Detail Page
- Large product image
- Product information
- Quantity selector
- Add to cart functionality

### Shopping Cart
- View all cart items
- Update quantities
- Remove items
- Order summary with total

### Checkout
- Shipping information form
- Order summary
- Secure checkout process

### Orders
- Order history
- Order details
- Order status tracking

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication. After login/register, the token is stored in localStorage and automatically included in API requests.

## 🗄️ Database Schema

- **Users** - User accounts
- **Categories** - Product categories
- **Products** - Product catalog
- **Cart** - Shopping cart items
- **Orders** - Order records
- **OrderItems** - Order line items

## 🛠️ Development Scripts

### Start Development Servers

```bash
# Linux/macOS
./dev.sh

# Windows
dev.bat
```

The script will:
- Check if Go and Node.js are installed
- Create `.env` files from examples if missing
- Install dependencies automatically
- Start backend on `http://localhost:10000`
- Start frontend on `http://localhost:10001`
- Handle cleanup on exit (Ctrl+C)

### Stop Development Servers

```bash
# Linux/macOS
./stop.sh
```

Or manually:
- Press `Ctrl+C` in the terminal running `dev.sh`
- On Windows, close the server windows

## 🚀 Deployment

### Backend Deployment

1. Build the Go binary:
```bash
cd backend
go build -o ecom-backend main.go
```

2. Run the binary:
```bash
./ecom-backend
```

### Frontend Deployment

1. Build the Next.js app:
```bash
cd frontend
npm run build
```

2. Start the production server:
```bash
npm start
```

Or deploy to Vercel:
```bash
vercel
```

## 🧪 Testing

You can test the API using tools like:
- Postman
- cURL
- Thunder Client (VS Code extension)

Example API call:
```bash
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

## 📝 Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=ecom_db
DB_PORT=5432
JWT_SECRET=your-secret-key-change-this
PORT=10000

# Redis (optional - defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:10000/api
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🐛 Troubleshooting

### Backend won't start
- Check if PostgreSQL is running
- Verify database credentials in `.env`
- Ensure port 10000 is not in use

### Frontend can't connect to backend
- Verify backend is running on port 10000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

### Database connection errors
- Ensure PostgreSQL is installed and running
- Verify database exists: `CREATE DATABASE ecom_db;`
- Check user permissions

## 🎯 Future Enhancements

- [ ] Payment gateway integration (Stripe, PayPal)
- [ ] Email notifications
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Admin dashboard
- [ ] Image upload for products
- [ ] Advanced search with filters
- [ ] Order tracking
- [ ] Discount codes and coupons

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Go and Next.js

# ecom
