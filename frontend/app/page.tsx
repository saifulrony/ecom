'use client'

import { useEffect, useState } from 'react'
import { productAPI, Product, Category } from '@/lib/api'
import ProductCard from '@/components/ProductCard'
import ChatBox from '@/components/ChatBox'
import Link from 'next/link'
import { FiArrowRight, FiTag } from 'react-icons/fi'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productAPI.getCategories()
        setCategories(response.data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params: any = { limit: 12 }
        if (selectedCategory) params.category_id = selectedCategory
        
        const response = await productAPI.getProducts(params)
        if (response.data && response.data.products) {
          setProducts(response.data.products)
        } else {
          console.error('Invalid response format:', response.data)
          setProducts([])
        }
      } catch (error: any) {
        console.error('Failed to fetch products:', error)
        // Handle rate limiting gracefully - set empty array instead of showing stale data
        if (error.response?.status === 429) {
          console.warn('Rate limit exceeded. Please wait a moment.')
        }
        setProducts([]) // Clear products on error to prevent showing stale data
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchProducts()
  }, [selectedCategory])

  return (
    <div className="min-h-screen bg-whitesmoke">
      {/* Hero Banner Section - Porto Shop 18 Style */}
      <section className="relative bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] py-20 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="text-white">
              <p className="text-lg text-gray-400 mb-2 uppercase tracking-wide">Spring / Summer Season</p>
              <div className="mb-4">
                <span className="text-2xl font-light">up to</span>
                <h1 className="text-7xl font-bold mb-4">50% OFF</h1>
              </div>
              <p className="text-xl text-gray-300 mb-2">STARTING AT</p>
              <p className="text-5xl font-bold text-[#ff6b35] mb-8">৳1,999</p>
              <Link
                href="/products"
                className="inline-block bg-white text-[#1a1a1a] px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition uppercase tracking-wide"
              >
                Shop Now
              </Link>
            </div>

            {/* Right Side - Product Image */}
            <div className="relative">
              <div className="relative w-full h-96 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35]/20 to-transparent rounded-lg"></div>
                <div className="relative z-10 w-80 h-80 bg-[#2a2a2a] rounded-lg flex items-center justify-center border border-gray-700">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">Featured Product</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-whitesmoke">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold text-gray-900">Featured Products</h2>
            <Link
              href="/products"
              className="text-[#ff6b35] hover:text-[#ff8c5a] font-semibold flex items-center space-x-2 transition"
            >
              <span>View All</span>
              <FiArrowRight />
            </Link>
          </div>

          <div className="flex gap-6">
            {/* Categories Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <FiTag className="w-5 h-5 text-[#ff6b35]" />
                  <span>Categories</span>
                </h3>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === null
                          ? 'bg-[#ff6b35] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Categories
                    </button>
                  </li>
                  {categories.map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-[#ff6b35] text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {category.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg overflow-hidden h-96 animate-pulse shadow-sm border border-gray-200">
                      <div className="h-64 bg-gray-200"></div>
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <svg className="w-8 h-8 text-[#ff6b35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">FREE SHIPPING</h3>
              <p className="text-gray-600">Orders Over ৳2,000</p>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <svg className="w-8 h-8 text-[#ff6b35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">24/7 SUPPORT</h3>
              <p className="text-gray-600">We're here to help</p>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <svg className="w-8 h-8 text-[#ff6b35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">SECURED PAYMENT</h3>
              <p className="text-gray-600">Safe & Fast</p>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <svg className="w-8 h-8 text-[#ff6b35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">FREE RETURNS</h3>
              <p className="text-gray-600">Easy & Free</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Box */}
      <ChatBox />
    </div>
  )
}
