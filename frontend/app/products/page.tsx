'use client'

import { useEffect, useState } from 'react'
import { productAPI, Product, Category } from '@/lib/api'
import ProductCard from '@/components/ProductCard'
import { FiSearch, FiFilter, FiX, FiDollarSign, FiPackage, FiTrendingUp } from 'react-icons/fi'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [inStock, setInStock] = useState<string | null>(null) // 'true', 'false', or null
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      setLoading(true)
      try {
        const params: any = { page, limit: 12, sort_by: sortBy, sort_order: sortOrder }
        if (selectedCategory) params.category_id = selectedCategory
        if (search) params.search = search
        if (minPrice) params.min_price = minPrice
        if (maxPrice) params.max_price = maxPrice
        if (inStock !== null) params.in_stock = inStock

        const response = await productAPI.getProducts(params)
        setProducts(response.data.products || [])
        setTotalPages(response.data.pagination?.pages || 1)
      } catch (error: any) {
        console.error('Failed to fetch products:', error)
        // Handle rate limiting gracefully
        if (error.response?.status === 429) {
          // Products will be empty, but don't show error - user can retry
          setProducts([])
        } else {
          // For other errors, still set empty array to prevent showing stale data
          setProducts([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [page, selectedCategory, search, minPrice, maxPrice, inStock, sortBy, sortOrder])

  const clearFilters = () => {
    setSearch('')
    setSelectedCategory(null)
    setMinPrice('')
    setMaxPrice('')
    setInStock(null)
    setSortBy('created_at')
    setSortOrder('desc')
    setPage(1)
  }

  const hasActiveFilters = search || selectedCategory || minPrice || maxPrice || inStock !== null || sortBy !== 'created_at' || sortOrder !== 'desc'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Search and Mobile Filter Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-gray-900">All Products</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden flex items-center space-x-2 px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] transition"
        >
          <FiFilter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
            placeholder="Search products by name, description, or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
            />
          </div>
      </div>

      <div className="flex gap-6 relative">
        {/* Sidebar Filters */}
        <aside className={`w-64 flex-shrink-0 ${sidebarOpen ? 'fixed left-0 top-0 h-full z-50 overflow-y-auto' : 'hidden'} lg:block lg:relative lg:z-auto`}>
          <div className={`bg-white ${sidebarOpen ? 'h-full shadow-2xl' : 'rounded-lg shadow-md'} border border-gray-200 p-6 lg:sticky lg:top-4`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <FiFilter className="w-5 h-5 text-[#ff6b35]" />
                <span>Filters</span>
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full mb-6 px-4 py-2 text-sm text-[#ff6b35] border border-[#ff6b35] rounded-lg hover:bg-[#ff6b35] hover:text-white transition"
              >
                Clear All Filters
              </button>
            )}

            {/* Categories Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <FiPackage className="w-4 h-4" />
                <span>Categories</span>
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === null}
                    onChange={() => {
                      setSelectedCategory(null)
                setPage(1)
              }}
                    className="w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                  <span className="text-sm text-gray-700">All Categories</span>
                </label>
              {categories.map((category) => (
                  <label key={category.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === category.id}
                      onChange={() => {
                        setSelectedCategory(category.id)
                        setPage(1)
                      }}
                      className="w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35]"
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <FiDollarSign className="w-4 h-4" />
                <span>Price Range</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Min Price (৳)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value)
                      setPage(1)
                    }}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Price (৳)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value)
                      setPage(1)
                    }}
                    placeholder="No limit"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                  />
          </div>
        </div>
      </div>

            {/* Stock Status Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Stock Status</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="stock"
                    checked={inStock === null}
                    onChange={() => {
                      setInStock(null)
                      setPage(1)
                    }}
                    className="w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                  <span className="text-sm text-gray-700">All Products</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="stock"
                    checked={inStock === 'true'}
                    onChange={() => {
                      setInStock('true')
                      setPage(1)
                    }}
                    className="w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                  <span className="text-sm text-gray-700">In Stock</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="radio"
                    name="stock"
                    checked={inStock === 'false'}
                    onChange={() => {
                      setInStock('false')
                      setPage(1)
                    }}
                    className="w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                  <span className="text-sm text-gray-700">Out of Stock</span>
                </label>
              </div>
            </div>

            {/* Sort Options */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <FiTrendingUp className="w-4 h-4" />
                <span>Sort By</span>
              </h3>
              <div className="space-y-2">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                >
                  <option value="created_at">Newest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price">Price</option>
                </select>
                {sortBy === 'price' && (
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value)
                      setPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm mt-2"
                  >
                    <option value="asc">Low to High</option>
                    <option value="desc">High to Low</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">

      {/* Products Grid */}
      {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md h-96 animate-pulse">
              <div className="h-64 bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 text-xl mb-4">No products found</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-[#ff6b35] border border-[#ff6b35] rounded-lg hover:bg-[#ff6b35] hover:text-white transition"
                >
                  Clear Filters
                </button>
              )}
        </div>
      ) : (
        <>
              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                Showing {products.length} product{products.length !== 1 ? 's' : ''} 
                {totalPages > 1 && ` (Page ${page} of ${totalPages})`}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
              >
                Previous
              </button>
                  <span className="px-4 py-2 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
              >
                Next
              </button>
            </div>
          )}
        </>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

