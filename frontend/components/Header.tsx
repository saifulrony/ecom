'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiShoppingCart, FiUser, FiLogOut, FiMenu, FiSearch, FiHeart, FiPackage, FiLock, FiLayout } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useState, useEffect } from 'react'
import { useCart } from '@/hooks/useCart'
import { wishlistAPI } from '@/lib/api'

export default function Header() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { items } = useCartStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [wishlistCount, setWishlistCount] = useState(0)
  
  // Refresh cart when user is logged in
  useCart()

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Fetch wishlist count
  useEffect(() => {
    const fetchWishlistCount = async () => {
      if (user) {
        try {
          const response = await wishlistAPI.getWishlist()
          const wishlist = response.data.wishlist || []
          setWishlistCount(wishlist.length)
        } catch (error) {
          console.error('Failed to fetch wishlist:', error)
          setWishlistCount(0)
        }
      } else {
        setWishlistCount(0)
      }
    }

    fetchWishlistCount()
    // Refresh wishlist count every 5 seconds to keep it updated
    const interval = setInterval(fetchWishlistCount, 5000)
    return () => clearInterval(interval)
  }, [user])

  const isAdminUser = user && ['admin', 'staff', 'manager'].includes(user.role?.toLowerCase() || '')

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
      setIsSearchOpen(false)
    }
  }

  return (
    <header className="bg-[#1a1a1a] text-white sticky top-0 z-50 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">PORTO</span>
            <span className="text-sm text-gray-400">eCommerce</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-[#ff6b35] transition font-medium">
              HOME
            </Link>
            <Link href="/products" className="text-white hover:text-[#ff6b35] transition font-medium">
              PRODUCTS
            </Link>
            <Link href="/products" className="text-white hover:text-[#ff6b35] transition font-medium">
              CATEGORIES
            </Link>
            {user && (
              <Link href="/orders" className="text-white hover:text-[#ff6b35] transition font-medium">
                ORDERS
              </Link>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Currency/Language Dropdowns */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-400">
              <span>৳</span>
              <span className="text-gray-400">|</span>
              <span>ENG</span>
            </div>

            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-white hover:text-[#ff6b35] transition"
            >
              <FiSearch className="w-5 h-5" />
            </button>

            {/* User Account */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-white hover:text-[#ff6b35] transition"
                >
                  <FiUser className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#2a2a2a] rounded-md shadow-lg py-1 z-50 border border-gray-700">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm font-medium text-gray-200">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    {isAdminUser && (
                      <Link
                        href="/admin/dashboard"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] flex items-center space-x-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <FiLayout className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] flex items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FiPackage className="w-4 h-4" />
                      <span>My Orders</span>
                    </Link>
                    <Link
                      href="/account/wishlist"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] flex items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FiHeart className="w-4 h-4" />
                      <span>Wishlist</span>
                    </Link>
                    <Link
                      href="/account/profile"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] flex items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FiUser className="w-4 h-4" />
                      <span>Profile Information</span>
                    </Link>
                    <Link
                      href="/account/security"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] flex items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FiLock className="w-4 h-4" />
                      <span>Security</span>
                    </Link>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] flex items-center space-x-2"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="p-2 text-white hover:text-[#ff6b35] transition"
              >
                <FiUser className="w-5 h-5" />
              </Link>
            )}

            {/* Wishlist */}
            {user ? (
              <Link
                href="/account/wishlist"
                className="relative p-2 text-white hover:text-[#ff6b35] transition"
              >
                <FiHeart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-gray-900 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="relative p-2 text-white hover:text-[#ff6b35] transition"
              >
                <FiHeart className="w-5 h-5" />
              </Link>
            )}

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-white hover:text-[#ff6b35] transition"
            >
              <FiShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-gray-900 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-white"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {isSearchOpen && (
          <div className="pb-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff6b35]"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#ff6b35] p-2"
              >
                <FiSearch className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="lg:hidden pb-4 border-t border-gray-800 pt-4 mt-4">
            <Link
              href="/"
              className="block py-2 text-white hover:text-[#ff6b35] transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/products"
              className="block py-2 text-white hover:text-[#ff6b35] transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Products
            </Link>
            {user && (
              <Link
                href="/orders"
                className="block py-2 text-white hover:text-[#ff6b35] transition"
                onClick={() => setIsMenuOpen(false)}
              >
                Orders
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
