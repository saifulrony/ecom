'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUsers, FiSearch, FiMail, FiPhone, FiUser, FiX, FiShoppingCart, FiDollarSign, FiCalendar, FiMapPin, FiCheckCircle, FiClock, FiXCircle, FiPackage, FiPauseCircle, FiRefreshCw, FiTruck, FiPrinter } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface Customer {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  role: string
  created_at?: string
}

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

export default function POSCustomersPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<POSOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      if (user && token) {
        const userRole = user.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }
        fetchCustomers()
        return
      }

      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!storedToken) {
        router.push('/admin/login')
        return
      }

      const timer = setTimeout(async () => {
        const currentUser = useAuthStore.getState().user
        const currentToken = useAuthStore.getState().token
        
        if (!currentUser || !currentToken) {
          try {
            const { authAPI } = await import('@/lib/api')
            const profileResponse = await authAPI.getProfile()
            const profileUser = profileResponse.data
            const userRole = profileUser.role?.toLowerCase()
            
            if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
              router.push('/admin/login')
              return
            }
            
            useAuthStore.getState().setAuth(profileUser, storedToken)
            fetchCustomers()
          } catch (err) {
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

        fetchCustomers()
      }, 100)

      return () => clearTimeout(timer)
    }

    checkAuth()
  }, [user, token, router])

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerOrders()
    }
  }, [selectedCustomer, statusFilter, dateRange, customDateFrom, customDateTo])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getCustomers()
      setCustomers(response.data?.customers || [])
    } catch (error: any) {
      console.error('Failed to fetch customers:', error)
      if (error.response?.status === 404) {
        setCustomers([])
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerOrders = async () => {
    if (!selectedCustomer) return
    
    setLoadingOrders(true)
    try {
      const response = await adminAPI.getPOSOrders({})
      const allOrders = response.data.orders || []
      // Filter orders by customer ID
      const orders = allOrders.filter((order: POSOrder) => order.user_id === selectedCustomer.id)
      setCustomerOrders(orders)
    } catch (error) {
      console.error('Failed to fetch customer orders:', error)
      setCustomerOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer)
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

  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString)
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { timePart, datePart }
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

  const filteredCustomers = customers.filter(customer => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    )
  })

  const filteredOrders = customerOrders.filter(order => {
    // Status filter
    if (statusFilter && order.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false
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

  const handlePrint = (order: POSOrder) => {
    const customerName = order.user?.name || selectedCustomer?.name || 'Walk-in Customer'
    const phone = order.user?.phone || selectedCustomer?.phone || ''
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
                  <span>${customerName}</span>
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POS Customers</h1>
            <p className="text-sm text-gray-600 mt-1">Manage customers for Point of Sale</p>
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{filteredCustomers.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4 flex-wrap lg:flex-nowrap gap-2">
          {/* Search - First */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="flex-1 overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center m-6">
            <FiUsers className="mx-auto text-6xl text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No customers found</h2>
            <p className="text-gray-600">
              {search ? 'Try adjusting your search terms' : 'No customers in the database yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto m-6">
            <table className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Member Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleCustomerClick(customer)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 hover:text-[#ff6b35] transition">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FiMail className="w-4 h-4" />
                        <span>{customer.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.phone ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiPhone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {customer.address ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiMapPin className="w-4 h-4" />
                          <span>{customer.address}{customer.city ? `, ${customer.city}` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {customer.created_at ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiCalendar className="w-4 h-4" />
                          <span>{new Date(customer.created_at).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Customer Profile</h2>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Customer Info */}
              <div className="flex items-start space-x-6 mb-6 pb-6 border-b border-gray-200">
                {/* Profile Picture */}
                <div className="w-24 h-24 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-3xl font-bold">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedCustomer.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FiMail className="w-4 h-4" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FiPhone className="w-4 h-4" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FiMapPin className="w-4 h-4" />
                        <span>{selectedCustomer.address}{selectedCustomer.city ? `, ${selectedCustomer.city}` : ''}{selectedCustomer.postal_code ? ` ${selectedCustomer.postal_code}` : ''}{selectedCustomer.country ? `, ${selectedCustomer.country}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Orders Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Orders</h3>
                  <div className="flex items-center space-x-2">
                    {/* Date Range Filter */}
                    <div className="flex items-center space-x-2">
                      <FiCalendar className="w-4 h-4 text-gray-500" />
                      <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
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
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                        />
                        <input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                        />
                      </>
                    )}
                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
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
                  </div>
                </div>

                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6b35]"></div>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FiShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No orders found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Order #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredOrders.map((order) => {
                          const { datePart, timePart } = formatTableDate(order.created_at)
                          return (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">#{order.id}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-gray-900">{timePart}</span>
                                  <span className="text-xs text-gray-600">{datePart}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-semibold text-[#ff6b35]">৳{order.total.toFixed(2)}</span>
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
          </div>
        </div>
      )}
    </div>
  )
}
