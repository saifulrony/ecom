'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FiSearch, FiShoppingCart, FiX, FiMinus, FiPlus, FiCheck, FiUser, FiDollarSign, FiTrash2, FiPercent, FiTag, FiEdit2 } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { productAPI, adminAPI, authAPI, Product, Category } from '@/lib/api'

interface POSCartItem {
  product_id: number
  product: Product
  quantity: number
  price: number
  variations?: Record<string, string>
}

type StockType = 'website' | 'showroom'

export default function POSPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isNewCustomer, setIsNewCustomer] = useState(true)
  const [customers, setCustomers] = useState<Array<{ id: number; name: string; email: string; phone?: string }>>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountType, setDiscountType] = useState<'coupon' | 'percentage' | 'fixed'>('coupon')
  const [discountValue, setDiscountValue] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [payments, setPayments] = useState<Array<{ method: string; amount: number; reference?: string }>>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState('cash')
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentReference, setNewPaymentReference] = useState('')
  const [stockType, setStockType] = useState<StockType>('website')
  const [sidebarWidth, setSidebarWidth] = useState(384) // Default 384px (w-96)
  const [isResizing, setIsResizing] = useState(false)
  const hasInitialFetch = useRef(false)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(384)
  const sidebarWidthRef = useRef(384)

  useEffect(() => {
    // Load stock type preference
    const savedStockType = typeof window !== 'undefined' 
      ? localStorage.getItem('pos_stock_type') as StockType
      : null
    
    if (savedStockType && (savedStockType === 'website' || savedStockType === 'showroom')) {
      setStockType(savedStockType)
    }

    // Load saved sidebar width
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('pos_sidebar_width')
      if (savedWidth) {
        const width = parseInt(savedWidth, 10)
        if (width >= 300 && width <= 800) { // Reasonable limits
          setSidebarWidth(width)
          resizeStartWidth.current = width
          sidebarWidthRef.current = width
        }
      }
    }

    // Check authentication - handle case where Zustand might still be hydrating in new tab
    const checkAuth = async () => {
      // Check if we have user and token from store
      if (user && token) {
        const userRole = user.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }
        setLoading(false)
        if (!hasInitialFetch.current) {
        fetchProducts()
        fetchCategories()
          fetchCustomers()
          hasInitialFetch.current = true
        }
        return
      }

      // If store doesn't have user/token yet, check localStorage (Zustand might still be hydrating)
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!storedToken) {
        router.push('/admin/login')
        return
      }

      // Wait a moment for Zustand to hydrate, then check again
      const timer = setTimeout(async () => {
        const currentUser = useAuthStore.getState().user
        const currentToken = useAuthStore.getState().token
        
        if (!currentUser || !currentToken) {
          // Token exists but user not loaded - fetch profile to get user data
          try {
            const profileResponse = await authAPI.getProfile()
            const profileUser = profileResponse.data
            const userRole = profileUser.role?.toLowerCase()
            
            if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
              router.push('/admin/login')
              return
            }
            
            // Update auth store with fetched profile
            useAuthStore.getState().setAuth(profileUser, storedToken)
            setLoading(false)
            if (!hasInitialFetch.current) {
            fetchProducts()
            fetchCategories()
              fetchCustomers()
              hasInitialFetch.current = true
            }
          } catch (err) {
            // Token invalid or expired
            console.error('Failed to fetch profile:', err)
            router.push('/admin/login')
          }
          return
        }

        const userRole = currentUser.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }

        setLoading(false)
        if (!hasInitialFetch.current) {
        fetchProducts()
        fetchCategories()
          fetchCustomers()
          hasInitialFetch.current = true
        }
      }, 100)

      return () => clearTimeout(timer)
    }

    checkAuth()
  }, [user, token, router])
  
  const fetchProducts = useCallback(async () => {
    if (!user || !token) return
    
    setLoading(true)
    try {
      const params: { [key: string]: any } = {}
      if (selectedCategory) params.category_id = selectedCategory
      if (search) params.search = search
      params.in_stock = 'true' // Only show in-stock products in POS
      
      // TODO: When backend supports separate POS stock, add:
      // params.stock_type = stockType // 'website' or 'showroom'
      // For now, we'll use the regular stock field
      
      const response = await productAPI.getProducts(params)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, search, stockType, user, token])

  // Debounced effect for search and category changes
  useEffect(() => {
    if (!user || !token || !hasInitialFetch.current) return

    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    // Set new timeout
    fetchTimeoutRef.current = setTimeout(() => {
      fetchProducts()
    }, 800) // Debounce by 800ms to reduce API calls

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [selectedCategory, search, stockType, user, token, fetchProducts])

  // Listen for stock type changes from settings page (only on actual changes)
  useEffect(() => {
    let lastStockType = stockType

    const handleStorageChange = () => {
      const savedStockType = typeof window !== 'undefined' 
        ? localStorage.getItem('pos_stock_type') as StockType
        : null
      
      if (savedStockType && (savedStockType === 'website' || savedStockType === 'showroom') && savedStockType !== lastStockType) {
        lastStockType = savedStockType
        setStockType(savedStockType)
      }
    }

    const handleCustomEvent = (e: CustomEvent) => {
      const newStockType = e.detail as StockType
      if ((newStockType === 'website' || newStockType === 'showroom') && newStockType !== lastStockType) {
        lastStockType = newStockType
        setStockType(newStockType)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('posStockTypeChanged', handleCustomEvent as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('posStockTypeChanged', handleCustomEvent as EventListener)
    }
  }, [stockType])

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await adminAPI.getCustomers()
      setCustomers(response.data || [])
    } catch (error: any) {
      // Handle 404 or other errors gracefully
      if (error.response?.status === 404) {
        console.warn('Customers endpoint not available, using empty list')
        setCustomers([])
      } else {
        console.error('Failed to fetch customers:', error)
      }
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id)
    
    if (existingItem) {
      // Increase quantity if already in cart
      const availableStock = stockType === 'showroom' ? (product.pos_stock ?? 0) : product.stock
      if (existingItem.quantity < availableStock) {
        setCart(cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      }
    } else {
      // Add new item to cart
      const availableStock = stockType === 'showroom' ? (product.pos_stock ?? 0) : product.stock
      if (availableStock > 0) {
        setCart([...cart, {
          product_id: product.id,
          product,
          quantity: 1,
          price: product.price,
        }])
      }
    }
  }

  const updateQuantity = (productId: number, change: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQuantity = item.quantity + change
        if (newQuantity <= 0) {
          return null
        }
        const availableStock = stockType === 'showroom' ? (item.product.pos_stock ?? 0) : item.product.stock
        if (newQuantity > availableStock) {
          return item
        }
        return { ...item, quantity: newQuantity }
      }
      return item
    }).filter(Boolean) as POSCartItem[])
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const calculateDiscount = () => {
    if (discountAmount > 0) {
      return discountAmount
    }
    const subtotal = calculateSubtotal()
    if (discountType === 'percentage' && discountValue) {
      const percentage = parseFloat(discountValue)
      if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
        return (subtotal * percentage) / 100
      }
    } else if (discountType === 'fixed' && discountValue) {
      const fixed = parseFloat(discountValue)
      if (!isNaN(fixed) && fixed > 0) {
        return Math.min(fixed, subtotal)
      }
    }
    return 0
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    return Math.max(0, subtotal - discount)
  }

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0)
  }

  const calculateRemaining = () => {
    return calculateTotal() - calculateTotalPaid()
  }

  const addPayment = () => {
    const amount = parseFloat(newPaymentAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }
    if (amount > calculateRemaining()) {
      alert(`Payment amount cannot exceed remaining balance of ৳${calculateRemaining().toFixed(2)}`)
      return
    }
    setPayments([...payments, {
      method: newPaymentMethod,
      amount: amount,
      reference: newPaymentReference || undefined,
    }])
    setNewPaymentAmount('')
    setNewPaymentReference('')
  }

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const handleApplyDiscount = () => {
    if (discountType === 'coupon') {
      if (!discountValue.trim()) {
        alert('Please enter a coupon code')
        return
      }
      setCouponCode(discountValue.toUpperCase())
      // TODO: Validate coupon with backend and set discountAmount
      setShowDiscountModal(false)
    } else if (discountType === 'percentage') {
      const percentage = parseFloat(discountValue)
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        alert('Please enter a valid percentage (1-100)')
        return
      }
      setDiscountAmount(0) // Will be calculated dynamically
      setShowDiscountModal(false)
    } else if (discountType === 'fixed') {
      const fixed = parseFloat(discountValue)
      if (isNaN(fixed) || fixed <= 0) {
        alert('Please enter a valid discount amount')
        return
      }
      const subtotal = calculateSubtotal()
      setDiscountAmount(Math.min(fixed, subtotal))
      setShowDiscountModal(false)
    }
  }

  const handleRemoveDiscount = () => {
    setDiscountType('coupon')
    setDiscountValue('')
    setDiscountAmount(0)
    setCouponCode('')
  }

  const handleSelectCustomer = (customer: { id: number; name: string; email: string; phone?: string } | null) => {
    if (customer) {
      setCustomerId(customer.id)
      setCustomerName(customer.name)
      setCustomerPhone(customer.phone || '')
      setIsNewCustomer(false)
    } else {
      setCustomerId(null)
      setCustomerName('Walk-in Customer')
      setCustomerPhone('')
      setIsNewCustomer(true)
    }
    setShowCustomerModal(false)
  }

  const handleCreateNewCustomer = () => {
    setCustomerId(null)
    setIsNewCustomer(true)
    setCustomerName('')
    setCustomerPhone('')
    setShowCustomerModal(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = sidebarWidth
  }

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return

      const diff = resizeStartX.current - e.clientX // Inverted because we're dragging left
      const newWidth = resizeStartWidth.current + diff
      
      // Constrain between 300px and 800px
      const constrainedWidth = Math.max(300, Math.min(800, newWidth))
      setSidebarWidth(constrainedWidth)
      sidebarWidthRef.current = constrainedWidth
    }

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false)
        // Save final width to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_sidebar_width', sidebarWidthRef.current.toString())
        }
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, sidebarWidth])

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty')
      return
    }

    setProcessing(true)
    try {
      if (payments.length === 0) {
        alert('Please add at least one payment method')
        setProcessing(false)
        return
      }

      const totalPaid = calculateTotalPaid()
      if (totalPaid <= 0) {
        alert('Total payment amount must be greater than 0')
        setProcessing(false)
        return
      }

      const orderData = {
        customer_id: customerId || 0,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          variations: item.variations || {},
        })),
        address: isNewCustomer && customerName !== 'Walk-in Customer' ? customerName : 'Walk-in Customer',
        city: 'N/A',
        postal_code: 'N/A',
        country: 'N/A',
        coupon_code: discountType === 'coupon' ? couponCode : undefined,
        payments: payments.map(p => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference || undefined,
        })),
        notes: customerName !== 'Walk-in Customer' ? `Customer: ${customerName}${customerPhone ? `, Phone: ${customerPhone}` : ''}` : undefined,
        stock_type: stockType, // Pass stock type to backend
      }

      // Debug: Log payments being sent
      console.log('Sending payments:', orderData.payments)
      console.log('Total payments:', orderData.payments.length)

      const response = await adminAPI.createPOSOrder(orderData)
      alert(`Order #${response.data.order.id} created successfully!`)
      
      // Clear cart and form
      setCart([])
      setCustomerId(null)
      setCustomerName('Walk-in Customer')
      setCustomerPhone('')
      setIsNewCustomer(true)
      handleRemoveDiscount()
      setPayments([])
      setNewPaymentMethod('cash')
      setNewPaymentAmount('')
      setNewPaymentReference('')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create order')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ width: `calc(100% - ${sidebarWidth}px)` }}>
          {/* Search and Filters */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    (() => {
                      const availableStock = stockType === 'showroom' ? (product.pos_stock ?? 0) : product.stock
                      return availableStock > 0 ? 'border-gray-200 hover:border-[#ff6b35]' : 'border-red-200 opacity-50'
                    })()
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiShoppingCart className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 text-xs mb-0.5 line-clamp-2">{product.name}</h3>
                    <p className="text-sm font-bold text-[#ff6b35]">৳{product.price.toFixed(2)}</p>
                    <p className={`text-[10px] mt-0.5 ${(() => {
                      const availableStock = stockType === 'showroom' ? (product.pos_stock ?? 0) : product.stock
                      return availableStock > 0 ? 'text-green-600' : 'text-red-600'
                    })()}`}>
                      Stock: {stockType === 'showroom' ? (product.pos_stock ?? 0) : product.stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className={`w-1 bg-gray-300 hover:bg-[#ff6b35] cursor-col-resize transition-colors flex-shrink-0 ${
            isResizing ? 'bg-[#ff6b35]' : ''
          }`}
          style={{ minWidth: '4px', width: '4px' }}
          title="Drag to resize"
        />

        {/* Cart Section */}
        <div 
          className="bg-white border-l border-gray-200 flex flex-col flex-shrink-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Cart ({cart.length})</h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Click products to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <div className="flex items-center gap-2">
                    {/* Left - Product Image */}
                    <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <FiShoppingCart className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    
                    {/* Middle - Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-xs">{item.product.name}</h4>
                          <p className="text-[#ff6b35] font-bold text-sm">৳{item.price.toFixed(2)}</p>
                          {/* Quantity Controls - Below Price */}
                          <div className="flex justify-start mt-1">
                            <div className="flex items-center border border-gray-300 rounded bg-white">
                              <button
                                onClick={() => updateQuantity(item.product_id, -1)}
                                className="px-1.5 py-1 hover:bg-gray-100 rounded-l transition-colors"
                              >
                                <FiMinus className="w-3.5 h-3.5 text-gray-700" />
                              </button>
                              <span className="px-2 py-1 text-xs font-semibold text-gray-900 min-w-[1.75rem] text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product_id, 1)}
                                className="px-1.5 py-1 hover:bg-gray-100 rounded-r transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity >= (stockType === 'showroom' ? (item.product.pos_stock ?? 0) : item.product.stock)}
                              >
                                <FiPlus className="w-3.5 h-3.5 text-gray-700" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="text-red-600 hover:text-red-700 p-0.5 flex-shrink-0 ml-1"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Right - Total */}
                    <div className="flex justify-end flex-shrink-0 w-20">
                      <p className="font-bold text-gray-900 text-sm">৳{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Discount - Compact */}
          <div className="p-3 border-t border-gray-200 flex gap-2">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="flex-1 flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-sm"
            >
              <div className="flex items-center space-x-2">
                <FiUser className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 font-medium text-xs truncate">
                  {isNewCustomer && customerName ? customerName : customerId ? customers.find(c => c.id === customerId)?.name || 'Select Customer' : 'Walk-in Customer'}
                </span>
            </div>
              <FiEdit2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
            <button
              onClick={() => setShowDiscountModal(true)}
              className="flex-1 flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-sm"
            >
              <div className="flex items-center space-x-2">
                <FiTag className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 font-medium text-xs truncate">
                  {calculateDiscount() > 0 
                    ? `Discount: ৳${calculateDiscount().toFixed(2)}` 
                    : 'Add Discount'}
                </span>
            </div>
              {calculateDiscount() > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveDiscount()
                  }}
                  className="text-red-600 hover:text-red-700 flex-shrink-0"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </button>
          </div>

          {/* Payment Methods - Single Line */}
          <div className="p-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Payments</h3>
            
            {/* Existing Payments - Single Line */}
            {payments.length > 0 && (
              <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                {payments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded text-xs">
                    <span className="font-medium text-gray-900 capitalize flex-shrink-0">{payment.method}</span>
                    <span className="font-semibold text-gray-900 flex-shrink-0">৳{payment.amount.toFixed(2)}</span>
                    <button
                      onClick={() => removePayment(index)}
                      className="p-0.5 text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Payment - Single Line */}
            <div className="flex items-center gap-2 mb-2">
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-xs flex-shrink-0"
                style={{ minWidth: '80px' }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile</option>
              </select>
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={calculateRemaining() > 0 ? calculateRemaining() : calculateTotal()}
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-xs"
                />
                {calculateRemaining() > 0 && (
                  <button
                    type="button"
                    onClick={() => setNewPaymentAmount(calculateRemaining().toFixed(2))}
                    className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    title="Fill remaining"
                  >
                    Fill
                  </button>
                )}
              </div>
              <button
                onClick={addPayment}
                disabled={!newPaymentAmount || parseFloat(newPaymentAmount) <= 0 || (calculateRemaining() > 0 && parseFloat(newPaymentAmount) > calculateRemaining())}
                className="px-3 py-1.5 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex-shrink-0 whitespace-nowrap"
              >
                Add More
              </button>
            </div>

            {/* Reference Field - Below */}
            <input
              type="text"
              value={newPaymentReference}
              onChange={(e) => setNewPaymentReference(e.target.value)}
              placeholder="Reference (optional)"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-xs"
            />
          </div>

          {/* Total and Checkout */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold">৳{calculateSubtotal().toFixed(2)}</span>
              </div>
              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span className="font-semibold">-৳{calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              {payments.length > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Paid:</span>
                    <span className="font-semibold text-green-600">৳{calculateTotalPaid().toFixed(2)}</span>
                  </div>
                  {calculateRemaining() > 0 && (
                    <div className="flex justify-between text-sm text-yellow-600">
                      <span>Remaining:</span>
                      <span className="font-semibold">৳{calculateRemaining().toFixed(2)}</span>
                    </div>
                  )}
                  {calculateRemaining() < 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Overpaid:</span>
                      <span className="font-semibold">৳{Math.abs(calculateRemaining()).toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-1.5 border-t border-gray-300">
                <span>Total:</span>
                <span className="text-[#ff6b35]">৳{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className="w-full bg-[#ff6b35] text-gray-900 py-2.5 rounded-lg font-semibold hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
            >
              <FiCheck className="w-4 h-4" />
              <span>{processing ? 'Processing...' : 'Complete Sale'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Select Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleSelectCustomer(null)}
                className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-[#ff6b35] transition"
              >
                <div className="font-semibold text-gray-900">Walk-in Customer</div>
                <div className="text-sm text-gray-500">No customer account</div>
              </button>
              
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-[#ff6b35] transition"
                >
                  <div className="font-semibold text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.email}{customer.phone ? ` • ${customer.phone}` : ''}</div>
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateNewCustomer}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Create New Customer
            </button>

            {isNewCustomer && (
              <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                    placeholder="Phone number"
                  />
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="w-full px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a] transition font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Apply Discount</h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setDiscountType('coupon')}
                    className={`px-4 py-2 rounded-lg border-2 transition ${
                      discountType === 'coupon'
                        ? 'border-[#ff6b35] bg-[#ff6b35] text-gray-900'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiTag className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">Coupon</div>
                  </button>
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`px-4 py-2 rounded-lg border-2 transition ${
                      discountType === 'percentage'
                        ? 'border-[#ff6b35] bg-[#ff6b35] text-gray-900'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiPercent className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">% Off</div>
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`px-4 py-2 rounded-lg border-2 transition ${
                      discountType === 'fixed'
                        ? 'border-[#ff6b35] bg-[#ff6b35] text-gray-900'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiDollarSign className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs">Fixed</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {discountType === 'coupon' ? 'Coupon Code' : discountType === 'percentage' ? 'Percentage (%)' : 'Discount Amount (৳)'}
                </label>
                <input
                  type={discountType === 'coupon' ? 'text' : 'number'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                  placeholder={
                    discountType === 'coupon' ? 'Enter coupon code' :
                    discountType === 'percentage' ? 'e.g., 10' :
                    'e.g., 50.00'
                  }
                />
              </div>

              {discountType === 'percentage' && discountValue && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Discount: ৳{((calculateSubtotal() * parseFloat(discountValue)) / 100).toFixed(2)}
                  </div>
                </div>
              )}

              {discountType === 'fixed' && discountValue && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Discount: ৳{Math.min(parseFloat(discountValue) || 0, calculateSubtotal()).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyDiscount}
                  className="flex-1 px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a] transition font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

