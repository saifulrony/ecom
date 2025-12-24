'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiPackage, FiCheckSquare, FiSquare, FiUpload, FiX, FiImage, FiCheck } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, productAPI, Product, Category, ProductVariation, VariationOption } from '@/lib/api'

export default function AdminProductsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [posStockType, setPosStockType] = useState<'website' | 'showroom'>('website')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [editingFields, setEditingFields] = useState<Map<number, { name?: string; price?: number; stock?: number; pos_stock?: number }>>(new Map())
  const [savingProductId, setSavingProductId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    stock: '',
    category_id: '',
    image: '',
    images: [] as string[],
    display_type: 'single' as 'single' | 'slider' | 'gallery',
  })
  const [uploading, setUploading] = useState(false)
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([])
  const [loadingVariations, setLoadingVariations] = useState(false)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [showOptionModal, setShowOptionModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null)
  const [editingOption, setEditingOption] = useState<VariationOption | null>(null)
  const [variationForm, setVariationForm] = useState({
    name: '',
    is_required: true,
    allow_custom: false,
  })
  const [optionForm, setOptionForm] = useState({
    value: '',
    price_modifier: '',
    stock: '',
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchProducts()
    fetchCategories()
    
    // Get POS stock type from localStorage
    const savedStockType = localStorage.getItem('pos_stock_type')
    if (savedStockType && (savedStockType === 'website' || savedStockType === 'showroom')) {
      setPosStockType(savedStockType)
    }
    
    // Listen for stock type changes
    const handleStockTypeChange = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && (customEvent.detail === 'website' || customEvent.detail === 'showroom')) {
        setPosStockType(customEvent.detail)
      }
    }
    
    window.addEventListener('posStockTypeChanged', handleStockTypeChange as EventListener)
    
    return () => {
      window.removeEventListener('posStockTypeChanged', handleStockTypeChange as EventListener)
    }
  }, [user, token, router])

  useEffect(() => {
    // Filter products based on search, category, and stock
    let filtered = [...products]

    // Apply search filter
    if (search) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory)
    }

    // Apply stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(product => {
        const stock = posStockType === 'showroom' ? (product as any).pos_stock ?? product.stock : product.stock
        if (stockFilter === 'in_stock') return stock > 10
        if (stockFilter === 'low_stock') return stock > 0 && stock <= 10
        if (stockFilter === 'out_of_stock') return stock === 0
        return true
      })
    }

    // Apply price range filter
    if (minPrice) {
      const min = parseFloat(minPrice)
      if (!isNaN(min)) {
        filtered = filtered.filter(product => product.price >= min)
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice)
      if (!isNaN(max)) {
        filtered = filtered.filter(product => product.price <= max)
      }
    }

    setFilteredProducts(filtered)
  }, [products, search, selectedCategory, stockFilter, minPrice, maxPrice, posStockType])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (selectedCategory) params.category_id = selectedCategory
      if (search) params.search = search
      const response = await productAPI.getProducts(params)
      const productsData = response.data.products || []
      setProducts(productsData)
      setFilteredProducts(productsData)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await adminAPI.deleteProduct(id)
      fetchProducts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete product')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return

    try {
      await adminAPI.bulkDeleteProducts(selectedProducts)
      setSelectedProducts([])
      fetchProducts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete products')
    }
  }

  const toggleProductSelection = (id: number) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(p => p !== id))
    } else {
      setSelectedProducts([...selectedProducts, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  const handleFieldEdit = (productId: number, field: 'name' | 'price' | 'stock' | 'pos_stock', value: string | number) => {
    const newEditingFields = new Map(editingFields)
    if (!newEditingFields.has(productId)) {
      newEditingFields.set(productId, {})
    }
    const product = products.find(p => p.id === productId)
    if (product) {
      const current = newEditingFields.get(productId) || {}
      if (field === 'name') {
        newEditingFields.set(productId, { ...current, name: value as string })
      } else if (field === 'price') {
        newEditingFields.set(productId, { ...current, price: parseFloat(value as string) || 0 })
      } else if (field === 'stock') {
        newEditingFields.set(productId, { ...current, stock: parseInt(value as string) || 0 })
      } else if (field === 'pos_stock') {
        newEditingFields.set(productId, { ...current, pos_stock: parseInt(value as string) || 0 })
      }
    }
    setEditingFields(newEditingFields)
  }

  const handleSaveProduct = async (productId: number) => {
    const edits = editingFields.get(productId)
    if (!edits || Object.keys(edits).length === 0) return

    setSavingProductId(productId)
    try {
      const updateData: any = {}
      if (edits.name !== undefined) updateData.name = edits.name
      if (edits.price !== undefined) updateData.price = edits.price
      
      // Always save stock and pos_stock separately
      if (edits.stock !== undefined) {
        updateData.stock = edits.stock
      }
      if (edits.pos_stock !== undefined) {
        updateData.pos_stock = edits.pos_stock
      }

      const response = await adminAPI.updateProduct(productId, updateData)
      
      // Refresh products to get the latest data from backend (including pos_stock)
      await fetchProducts()

      // Clear editing state for this product
      const newEditingFields = new Map(editingFields)
      newEditingFields.delete(productId)
      setEditingFields(newEditingFields)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update product')
    } finally {
      setSavingProductId(null)
    }
  }

  const hasUnsavedChanges = (productId: number) => {
    const edits = editingFields.get(productId)
    return edits && Object.keys(edits).length > 0
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await adminAPI.uploadImage(formData)
      let url = response.data.url
      // If relative path, prepend backend base URL (without /api)
      if (url.startsWith('/uploads/')) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        const port = '10000'
        url = `http://${hostname}:${port}${url}`
      }
      return url
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload image')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      const url = await handleImageUpload(file)
      if (url) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, url],
          image: prev.image || url, // Set as main image if none exists
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const imagesJson = formData.images.length > 0 ? JSON.stringify(formData.images) : ''
      
      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        sku: formData.sku,
        stock: parseInt(formData.stock),
        category_id: parseInt(formData.category_id),
        image: formData.image || (formData.images[0] || ''),
        images: imagesJson,
        display_type: formData.display_type,
      }

      if (editingProduct) {
        await adminAPI.updateProduct(editingProduct.id, data)
      } else {
        await adminAPI.createProduct(data)
      }

      setShowModal(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save product')
    }
  }

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      price: '', 
      sku: '',
      stock: '', 
      category_id: '', 
      image: '',
      images: [],
      display_type: 'single',
    })
    setProductVariations([])
  }

  const openEditModal = async (product: Product) => {
    setEditingProduct(product)
    
    // Parse images if they exist
    let images: string[] = []
    if (product.images) {
      if (typeof product.images === 'string') {
        try {
          images = JSON.parse(product.images)
        } catch {
          images = product.images.split(',').filter(Boolean)
        }
      } else {
        images = product.images
      }
    }
    if (product.image && !images.includes(product.image)) {
      images = [product.image, ...images]
    }
    
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      sku: product.sku || '',
      stock: product.stock.toString(),
      category_id: product.category_id.toString(),
      image: product.image || '',
      images: images,
      display_type: product.display_type || 'single',
    })
    
    // Fetch variations for this product
    setLoadingVariations(true)
    try {
      const response = await adminAPI.getProductVariations(product.id)
      setProductVariations(response.data.variations || [])
    } catch (error) {
      console.error('Failed to fetch variations:', error)
      setProductVariations([])
    } finally {
      setLoadingVariations(false)
    }
    
    setShowModal(true)
  }

  const fetchVariations = async () => {
    if (!editingProduct) return
    try {
      const response = await adminAPI.getProductVariations(editingProduct.id)
      setProductVariations(response.data.variations || [])
    } catch (error) {
      console.error('Failed to fetch variations:', error)
    }
  }

  const handleCreateVariation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    try {
      if (editingVariation) {
        await adminAPI.updateProductVariation(editingVariation.id, variationForm)
      } else {
        await adminAPI.createProductVariation(editingProduct.id, variationForm)
      }
      setShowVariationModal(false)
      setEditingVariation(null)
      setVariationForm({ name: '', is_required: true, allow_custom: false })
      fetchVariations()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save variation')
    }
  }

  const handleDeleteVariation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this variation?')) return
    try {
      await adminAPI.deleteProductVariation(id)
      fetchVariations()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete variation')
    }
  }

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariation) return
    try {
      if (editingOption) {
        await adminAPI.updateVariationOption(selectedVariation.id, editingOption.id, {
          value: optionForm.value,
          price_modifier: parseFloat(optionForm.price_modifier) || 0,
          stock: parseInt(optionForm.stock) || 0,
        })
      } else {
        await adminAPI.createVariationOption(selectedVariation.id, {
          value: optionForm.value,
          price_modifier: parseFloat(optionForm.price_modifier) || 0,
          stock: parseInt(optionForm.stock) || 0,
        })
      }
      setShowOptionModal(false)
      setSelectedVariation(null)
      setEditingOption(null)
      setOptionForm({ value: '', price_modifier: '', stock: '' })
      fetchVariations()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save option')
    }
  }

  const handleDeleteOption = async (variationId: number, optionId: number) => {
    if (!confirm('Are you sure you want to delete this option?')) return
    try {
      await adminAPI.deleteVariationOption(variationId, optionId)
      fetchVariations()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete option')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your products</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null)
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center space-x-2 bg-[#ff6b35] text-gray-900 px-4 py-2 rounded-lg hover:bg-[#ff8c5a] transition"
        >
          <FiPlus />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center flex-wrap gap-3 lg:flex-nowrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
          >
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {/* Min Price Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Min Price:</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              min="0"
            />
          </div>

          {/* Max Price Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Max Price:</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {selectedProducts.length} product(s) selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-200 text-red-900 rounded-lg hover:bg-red-300"
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                {posStockType === 'showroom' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POS Stock</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const posStock = (product as any).pos_stock ?? product.stock
                  const displayStock = posStockType === 'showroom' ? posStock : product.stock
                  const getStockColor = (stock: number) => {
                    if (stock === 0) return 'text-red-600 font-semibold'
                    if (stock <= 10) return 'text-yellow-600 font-semibold'
                    return 'text-gray-900'
                  }
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {product.image ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-400" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>'
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <FiPackage className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <input
                            type="text"
                            value={editingFields.get(product.id)?.name ?? product.name}
                            onChange={(e) => handleFieldEdit(product.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {product.sku && (
                            <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">৳</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editingFields.get(product.id)?.price ?? product.price}
                            onChange={(e) => handleFieldEdit(product.id, 'price', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={editingFields.get(product.id)?.stock !== undefined ? editingFields.get(product.id)?.stock : product.stock}
                          onChange={(e) => handleFieldEdit(product.id, 'stock', e.target.value)}
                          className={`w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff6b35] bg-white text-sm ${getStockColor(editingFields.get(product.id)?.stock !== undefined ? editingFields.get(product.id)?.stock! : product.stock)}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      {posStockType === 'showroom' && (
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={editingFields.get(product.id)?.pos_stock !== undefined ? editingFields.get(product.id)?.pos_stock : posStock}
                            onChange={(e) => handleFieldEdit(product.id, 'pos_stock', e.target.value)}
                            className={`w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff6b35] bg-white text-sm ${getStockColor(editingFields.get(product.id)?.pos_stock !== undefined ? editingFields.get(product.id)?.pos_stock! : posStock)}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {hasUnsavedChanges(product.id) && (
                            <button
                              onClick={() => handleSaveProduct(product.id)}
                              disabled={savingProductId === product.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                              title="Save changes"
                            >
                              {savingProductId === product.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              ) : (
                                <FiCheck className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <Link
                            href={`/admin/products/${product.id}/variations`}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                            title="Manage Variations"
                          >
                            <FiPackage className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Product"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Product"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={posStockType === 'showroom' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-12345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Type</label>
                <select
                  value={formData.display_type}
                  onChange={(e) => setFormData({ ...formData, display_type: e.target.value as 'single' | 'slider' | 'gallery' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                >
                  <option value="single">Single Image</option>
                  <option value="slider">Slider</option>
                  <option value="gallery">Gallery</option>
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-900">
                      <FiUpload className="w-5 h-5" />
                      <span>{uploading ? 'Uploading...' : 'Upload Images'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="Or enter image URL"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                    />
                  </div>
                  {(formData.images.length > 0 || formData.image) && (
                    <div className="grid grid-cols-4 gap-3">
                      {formData.image && (
                        <div className="relative group">
                          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={formData.image}
                              alt="Main"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="absolute top-1 left-1 bg-blue-200 text-blue-900 text-xs px-2 py-1 rounded">Main</div>
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = formData.images.filter(img => img !== formData.image)
                              setFormData({ ...formData, image: newImages[0] || '', images: newImages })
                            }}
                            className="absolute top-1 right-1 bg-red-200 text-red-900 p-1 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {formData.images.filter(img => img !== formData.image).map((img, idx) => (
                        <div key={idx} className="relative group">
                          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={img}
                              alt={`Image ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = formData.images.filter(i => i !== img)
                              setFormData({ ...formData, images: newImages })
                            }}
                            className="absolute top-1 right-1 bg-red-200 text-red-900 p-1 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image: img })}
                            className="absolute bottom-1 left-1 bg-blue-200 text-blue-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            Set Main
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Variations Section */}
              {editingProduct && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Product Variations</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVariation(null)
                        setVariationForm({ name: '', is_required: true, allow_custom: false })
                        setShowVariationModal(true)
                      }}
                      className="flex items-center space-x-2 text-sm px-3 py-1 bg-[#ff6b35] text-gray-900 rounded hover:bg-[#ff8c5a]"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Add Variation</span>
                    </button>
                  </div>
                  {loadingVariations ? (
                    <p className="text-gray-500 text-sm">Loading variations...</p>
                  ) : productVariations.length > 0 ? (
                    <div className="space-y-3">
                      {productVariations.map((variation) => (
                        <div key={variation.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{variation.name}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                {variation.is_required && (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                                )}
                                {variation.allow_custom && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Custom Allowed</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVariation(variation)
                                  setEditingOption(null)
                                  setOptionForm({ value: '', price_modifier: '', stock: '' })
                                  setShowOptionModal(true)
                                }}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                <FiPlus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVariation(variation)
                                  setVariationForm({
                                    name: variation.name,
                                    is_required: variation.is_required,
                                    allow_custom: variation.allow_custom,
                                  })
                                  setShowVariationModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVariation(variation.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {variation.options && variation.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {variation.options.map((option) => (
                                <div key={option.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <span className="text-gray-900">
                                    {option.value}
                                    {option.price_modifier > 0 && (
                                      <span className="text-green-600 ml-2">+৳{option.price_modifier}</span>
                                    )}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedVariation(variation)
                                        setEditingOption(option)
                                        setOptionForm({
                                          value: option.value,
                                          price_modifier: option.price_modifier.toString(),
                                          stock: option.stock.toString(),
                                        })
                                        setShowOptionModal(true)
                                      }}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <FiEdit className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOption(variation.id, option.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <FiX className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No variations added yet</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingProduct(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  {editingProduct ? 'Update' : 'Create'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variation Modal */}
      {showVariationModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingVariation ? 'Edit Variation' : 'Add Variation'}
              </h2>
              <button
                onClick={() => {
                  setShowVariationModal(false)
                  setEditingVariation(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateVariation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Variation Name</label>
                <input
                  type="text"
                  required
                  value={variationForm.name}
                  onChange={(e) => setVariationForm({ ...variationForm, name: e.target.value })}
                  placeholder="e.g., Color, Size, Material"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={variationForm.is_required}
                  onChange={(e) => setVariationForm({ ...variationForm, is_required: e.target.checked })}
                  className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <label className="text-sm text-gray-700">Required</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={variationForm.allow_custom}
                  onChange={(e) => setVariationForm({ ...variationForm, allow_custom: e.target.checked })}
                  className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <label className="text-sm text-gray-700">Allow Custom Value</label>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariationModal(false)
                    setEditingVariation(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  {editingVariation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && selectedVariation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOption ? 'Edit Option' : 'Add Option'} - {selectedVariation.name}
              </h2>
              <button
                onClick={() => {
                  setShowOptionModal(false)
                  setSelectedVariation(null)
                  setEditingOption(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOption} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Option Value</label>
                <input
                  type="text"
                  required
                  value={optionForm.value}
                  onChange={(e) => setOptionForm({ ...optionForm, value: e.target.value })}
                  placeholder="e.g., Red, Large, Cotton"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Modifier (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={optionForm.price_modifier}
                    onChange={(e) => setOptionForm({ ...optionForm, price_modifier: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                  <input
                    type="number"
                    value={optionForm.stock}
                    onChange={(e) => setOptionForm({ ...optionForm, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionModal(false)
                    setSelectedVariation(null)
                    setEditingOption(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  {editingOption ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
