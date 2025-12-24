'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiPhone, FiMail, FiArrowLeft, FiShoppingCart, FiDollarSign, FiCheckCircle, FiClock, FiXCircle, FiChevronDown, FiChevronUp, FiPrinter, FiEye, FiEdit2, FiSave, FiCheck, FiDownload, FiUpload, FiCalendar, FiPackage, FiPauseCircle, FiRefreshCw, FiTruck } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, authAPI } from '@/lib/api'

interface Payment {
  id: number
  method: string
  amount: number
  reference?: string
  created_at: string
}

interface OrderItem {
  id: number
  product_id: number
  product: {
    id: number
    name: string
    image?: string
  }
  quantity: number
  price: number
}

interface POSOrder {
  id: number
  user_id: number
  user?: {
    id: number
    name: string
    email: string
    phone?: string
  }
  total: number
  status: string
  address: string
  city: string
  postal_code: string
  country: string
  created_at: string
  items: OrderItem[]
  payments: Payment[]
  total_paid: number
  remaining_balance: number
  is_fully_paid: boolean
  notes?: string
}

export default function CashierProfilePage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [cashierProfile, setCashierProfile] = useState<{ phone?: string; email?: string } | null>(null)
  const [orders, setOrders] = useState<POSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('')
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set())
  const [editingOrders, setEditingOrders] = useState<Map<number, {
    customerName: string
    phone: string
    address: string
    notes: string
  }>>(new Map())
  const [savingOrders, setSavingOrders] = useState<Set<number>>(new Set())
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user || !token || !['admin', 'staff', 'manager'].includes(user.role?.toLowerCase() || '')) {
      router.push('/admin/login')
      return
    }
    fetchProfile()
    fetchOrders()
  }, [user, token, router, statusFilter, searchQuery])

  const fetchProfile = async () => {
    try {
      const profileResponse = await authAPI.getProfile()
      setCashierProfile(profileResponse.data)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params: { [key: string]: any } = {}
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      
      const response = await adminAPI.getPOSOrders(params)
      // Note: Currently showing all POS orders since cashier tracking isn't implemented
      // In the future, filter by: order.cashier_id === user.id
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Failed to fetch POS orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-blue-100 text-blue-800'
      case 'partial refund': return 'bg-orange-100 text-orange-800'
      case 'full refund': return 'bg-red-100 text-red-800'
      case 'hold': return 'bg-purple-100 text-purple-800'
      case 'delivering': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return FiCheckCircle
      case 'pending': return FiClock
      case 'cancelled': return FiXCircle
      case 'partial': return FiDollarSign
      case 'partial refund': return FiRefreshCw
      case 'full refund': return FiRefreshCw
      case 'hold': return FiPauseCircle
      case 'delivering': return FiTruck
      default: return FiPackage
    }
  }

  const extractCustomerNameFromNotes = (notes?: string, user?: { name?: string }) => {
    if (user?.name) return user.name
    if (!notes) return 'Walk-in Customer'
    const match = notes.match(/Customer:\s*([^,]+)/i)
    return match ? match[1].trim() : 'Walk-in Customer'
  }

  const extractPhoneFromNotes = (notes?: string, user?: { phone?: string }) => {
    if (user?.phone) return user.phone
    if (!notes) return ''
    const match = notes.match(/Phone:\s*([^,]+)/i)
    return match ? match[1].trim() : ''
  }

  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString)
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { timePart, datePart }
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(prev => new Set(prev).add(orderId))
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus)
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ))
    } catch (error) {
      console.error('Failed to update order status:', error)
      alert('Failed to update order status')
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const startEditing = (order: POSOrder) => {
    const customerName = extractCustomerNameFromNotes(order.notes, order.user)
    const phone = extractPhoneFromNotes(order.notes, order.user)
    setEditingOrders(new Map(editingOrders.set(order.id, {
      customerName,
      phone,
      address: order.address,
      notes: order.notes || '',
    })))
  }

  const updateEditingField = (orderId: number, field: string, value: string) => {
    const current = editingOrders.get(orderId)
    if (current) {
      setEditingOrders(new Map(editingOrders.set(orderId, { ...current, [field]: value })))
    }
  }

  const handleSaveOrder = async (orderId: number) => {
    const editingData = editingOrders.get(orderId)
    if (!editingData) return

    setSavingOrders(prev => new Set(prev).add(orderId))
    try {
      await adminAPI.updatePOSOrder(orderId, {
        address: editingData.address,
        notes: editingData.notes,
      })
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              address: editingData.address,
              notes: editingData.notes,
            } 
          : order
      ))
      setEditingOrders(prev => {
        const newMap = new Map(prev)
        newMap.delete(orderId)
        return newMap
      })
    } catch (error) {
      console.error('Failed to save order:', error)
      alert('Failed to save order changes')
    } finally {
      setSavingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)))
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) return
    setBulkUpdating(true)
    try {
      await Promise.all(Array.from(selectedOrders).map(orderId => 
        adminAPI.updateOrderStatus(orderId, newStatus)
      ))
      setOrders(orders.map(order => 
        selectedOrders.has(order.id) ? { ...order, status: newStatus } : order
      ))
      setSelectedOrders(new Set())
    } catch (error) {
      console.error('Failed to bulk update orders:', error)
      alert('Failed to update some orders')
    } finally {
      setBulkUpdating(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return { from: today, to: now }
      case 'yesterday':
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return { from: yesterday, to: yesterdayEnd }
      case 'this_week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        return { from: weekStart, to: now }
      case 'this_month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: monthStart, to: now }
      case 'quarterly':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        return { from: quarterStart, to: now }
      case 'custom':
        if (customDateFrom && customDateTo) {
          return { from: new Date(customDateFrom), to: new Date(customDateTo) }
        }
        return null
      default:
        return null
    }
  }

  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter && order.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const matchesId = order.id.toString().includes(searchLower)
      const customerName = extractCustomerNameFromNotes(order.notes, order.user)
      const matchesName = customerName.toLowerCase().includes(searchLower)
      const phone = extractPhoneFromNotes(order.notes, order.user)
      const matchesPhone = phone.includes(searchLower)
      if (!matchesId && !matchesName && !matchesPhone) {
        return false
      }
    }

    // Amount filters
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (isNaN(min) || order.total < min) return false
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (isNaN(max) || order.total > max) return false
    }

    // Payment method filter
    if (paymentMethodFilter) {
      const hasMethod = order.payments?.some(p => 
        p.method.toLowerCase() === paymentMethodFilter.toLowerCase()
      )
      if (!hasMethod) return false
    }

    // Date range filter
    const dateRangeFilter = getDateRange()
    if (dateRangeFilter) {
      const orderDate = new Date(order.created_at)
      if (orderDate < dateRangeFilter.from || orderDate > dateRangeFilter.to) {
        return false
      }
    }

    return true
  })

  const handleExport = () => {
    setExporting(true)
    try {
      const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Address', 'Total', 'Status', 'Payment Methods']
      const rows = filteredOrders.map(order => {
        const customerName = extractCustomerNameFromNotes(order.notes, order.user)
        const phone = extractPhoneFromNotes(order.notes, order.user)
        const dateTime = formatTableDate(order.created_at)
        const paymentMethods = order.payments?.map(p => `${p.method}: ৳${p.amount.toFixed(2)}`).join(', ') || 'N/A'
        return [
          order.id,
          `${dateTime.datePart} ${dateTime.timePart}`,
          customerName,
          phone,
          order.address,
          order.total.toFixed(2),
          order.status,
          paymentMethods,
        ]
      })
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pos-orders-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export orders')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = (order: POSOrder) => {
    const customerName = extractCustomerNameFromNotes(order.notes, order.user)
    const phone = extractPhoneFromNotes(order.notes, order.user)
    const dateTime = formatTableDate(order.created_at)
    const items = order.items || []

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discount = subtotal - order.total

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Order #${order.id}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                margin: 0;
                padding: 0;
                width: 80mm;
                font-size: 12px;
                color: #000;
              }
              .receipt {
                width: 100%;
                padding: 5mm;
                box-sizing: border-box;
              }
              .header {
                text-align: center;
                margin-bottom: 10px;
              }
              .store-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 2px;
              }
              .store-address {
                font-size: 10px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .order-info, .totals, .payments {
                margin-bottom: 10px;
              }
              .order-info-row, .item-row, .total-row, .payment-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
              }
              .item-row span:first-child {
                flex-grow: 1;
                margin-right: 5px;
              }
              .item-row span:nth-child(2) {
                width: 30px;
                text-align: right;
              }
              .item-row span:nth-child(3) {
                width: 50px;
                text-align: right;
              }
              .item-row span:last-child {
                width: 60px;
                text-align: right;
                font-weight: bold;
              }
              .total-row span:last-child, .payment-row span:last-child {
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 10px;
              }
              @page {
                size: 80mm auto;
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="store-name">EcomStore</div>
                <div class="store-address">Point of Sale Receipt</div>
              </div>

              <div class="divider"></div>

              <div class="order-info">
                <div class="order-info-row">
                  <span>Order #:</span>
                  <span>${order.id}</span>
                </div>
                <div class="order-info-row">
                  <span>Date:</span>
                  <span>${dateTime.datePart}</span>
                </div>
                <div class="order-info-row">
                  <span>Time:</span>
                  <span>${dateTime.timePart}</span>
                </div>
                <div class="order-info-row">
                  <span>Customer:</span>
                  <span>${customerName || 'Walk-in Customer'}</span>
                </div>
                ${phone ? `<div class="order-info-row"><span>Phone:</span><span>${phone}</span></div>` : ''}
              </div>

              <div class="divider"></div>

              <div class="items">
                ${items.map(item => `
                  <div class="item-row">
                    <span>${item.product?.name || 'Product'}</span>
                    <span>${item.quantity}</span>
                    <span>@${item.price.toFixed(2)}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>

              <div class="divider"></div>

              <div class="totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                  <div class="total-row">
                    <span>Discount:</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="total-row">
                  <span>Grand Total:</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>

              <div class="divider"></div>

              <div class="payments">
                ${order.payments && order.payments.length > 0 ? `
                  ${order.payments.map(payment => `
                    <div class="payment-row">
                      <span>${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}:</span>
                      <span>${payment.amount.toFixed(2)}</span>
                    </div>
                  `).join('')}
                  <div class="payment-row">
                    <span>Total Paid:</span>
                    <span>${order.total_paid.toFixed(2)}</span>
                  </div>
                  ${order.remaining_balance > 0 ? `
                    <div class="payment-row">
                      <span>Balance Due:</span>
                      <span>${order.remaining_balance.toFixed(2)}</span>
                    </div>
                  ` : ''}
                ` : '<span>No payments recorded</span>'}
              </div>

              <div class="divider"></div>

              <div class="footer">
                Thank you for your purchase!
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const isEditing = (orderId: number) => editingOrders.has(orderId)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/pos')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cashier Profile</h1>
              <p className="text-sm text-gray-600 mt-1">View your profile and orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-start space-x-6">
          {/* Profile Picture */}
          <div className="w-24 h-24 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>

          {/* Profile Details */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{user?.name || 'User'}</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FiMail className="w-4 h-4" />
                <span>{user?.email || cashierProfile?.email || 'N/A'}</span>
              </div>
              {cashierProfile?.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FiPhone className="w-4 h-4" />
                  <span>{cashierProfile.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FiUser className="w-4 h-4" />
                <span className="capitalize">{user?.role || 'staff'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-4 flex-wrap lg:flex-nowrap gap-2">
            {/* Search - First */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <FiCalendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              >
                <option value="all">All Orders</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="quarterly">Quarterly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial Payment</option>
              <option value="cancelled">Cancelled</option>
              <option value="partial refund">Partial Refund</option>
              <option value="full refund">Full Refund</option>
              <option value="hold">Hold</option>
              <option value="delivering">Delivering</option>
            </select>

            {/* Min Amount */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Min:</label>
              <input
                type="number"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Amount */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Max:</label>
              <input
                type="number"
                placeholder="0.00"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment Method */}
            <div className="flex items-center space-x-2 flex-1">
              <label className="text-sm text-gray-600 whitespace-nowrap">Payment:</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              >
                <option value="">All Methods</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <FiDownload className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="bg-[#ff6b35] text-white px-6 py-3 flex items-center justify-between">
          <span className="font-semibold">{selectedOrders.size} order(s) selected</span>
          <div className="flex items-center space-x-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusUpdate(e.target.value)
                }
              }}
              disabled={bulkUpdating}
              className="px-3 py-1.5 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="">Change Status...</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial Payment</option>
              <option value="cancelled">Cancelled</option>
              <option value="partial refund">Partial Refund</option>
              <option value="full refund">Full Refund</option>
              <option value="hold">Hold</option>
              <option value="delivering">Delivering</option>
            </select>
            <button
              onClick={() => setSelectedOrders(new Set())}
              className="px-3 py-1.5 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiShoppingCart className="mx-auto text-6xl text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-600">No orders match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Note</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const customerName = extractCustomerNameFromNotes(order.notes, order.user)
                  const phone = extractPhoneFromNotes(order.notes, order.user)
                  const StatusIcon = getStatusIcon(order.status)
                  const editingData = editingOrders.get(order.id)

                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">#{order.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const { datePart, timePart } = formatTableDate(order.created_at)
                          return (
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900">{timePart}</span>
                              <span className="text-xs text-gray-600">{datePart}</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing(order.id) ? (
                          <input
                            type="text"
                            value={editingData?.customerName || ''}
                            onChange={(e) => updateEditingField(order.id, 'customerName', e.target.value)}
                            className="w-full px-2 py-1 border border-[#ff6b35] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 hover:bg-gray-100 cursor-pointer rounded px-2 py-1 -mx-2 -my-1" onClick={() => startEditing(order)}>{customerName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing(order.id) ? (
                          <input
                            type="text"
                            value={editingData?.phone || ''}
                            onChange={(e) => updateEditingField(order.id, 'phone', e.target.value)}
                            className="w-full px-2 py-1 border border-[#ff6b35] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 hover:bg-gray-100 cursor-pointer rounded px-2 py-1 -mx-2 -my-1" onClick={() => startEditing(order)}>{phone || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing(order.id) ? (
                          <input
                            type="text"
                            value={editingData?.address || ''}
                            onChange={(e) => updateEditingField(order.id, 'address', e.target.value)}
                            className="w-full px-2 py-1 border border-[#ff6b35] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 hover:bg-gray-100 cursor-pointer rounded px-2 py-1 -mx-2 -my-1" onClick={() => startEditing(order)}>{order.address}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing(order.id) ? (
                          <input
                            type="text"
                            value={editingData?.notes || ''}
                            onChange={(e) => updateEditingField(order.id, 'notes', e.target.value)}
                            className="w-full px-2 py-1 border border-[#ff6b35] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 hover:bg-gray-100 cursor-pointer rounded px-2 py-1 -mx-2 -my-1" onClick={() => startEditing(order)}>{order.notes || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                              {item.product?.name} x{item.quantity}
                            </span>
                          ))}
                          {order.items && order.items.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-semibold">
                              +{order.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updatingStatus.has(order.id)}
                          className={`px-2 py-1 rounded text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] ${getStatusColor(order.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="partial">Partial</option>
                          <option value="partial refund">Partial Refund</option>
                          <option value="full refund">Full Refund</option>
                          <option value="hold">Hold</option>
                          <option value="delivering">Delivering</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {order.payments && Array.isArray(order.payments) && order.payments.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {order.payments.map((payment, index) => (
                              <div key={payment.id || index} className="text-xs text-gray-700">
                                <span className="capitalize">{payment.method}</span> <span className="font-semibold text-gray-900">৳{payment.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="text-xs font-bold text-gray-900 pt-0.5 border-t border-gray-200 mt-0.5">
                              Total = ৳{order.total.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No payments</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing(order.id) ? (
                          <button
                            onClick={() => handleSaveOrder(order.id)}
                            disabled={savingOrders.has(order.id)}
                            className="px-3 py-1 bg-[#ff6b35] text-white rounded hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center space-x-1"
                          >
                            <FiSave className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditing(order)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center space-x-1"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handlePrint(order)}
                          className="p-1.5 text-gray-600 hover:text-[#ff6b35] transition"
                        >
                          <FiPrinter className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

