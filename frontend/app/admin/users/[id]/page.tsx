'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiMail, FiPhone, FiMapPin, FiShoppingCart, FiDollarSign, FiCalendar, FiCheckCircle, FiClock, FiXCircle, FiPackage, FiPauseCircle, FiRefreshCw, FiTruck, FiPrinter } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, Order } from '@/lib/api'

interface User {
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

interface UserOrder extends Order {
  payments?: Payment[]
  total_paid?: number
  remaining_balance?: number
  is_fully_paid?: boolean
  items?: OrderItem[]
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { user, token } = useAuthStore()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    // Only admin can view user profiles
    if (user.role?.toLowerCase() !== 'admin') {
      router.push('/admin/dashboard')
      return
    }

    fetchUser()
    fetchUserOrders()
  }, [user, token, router, params.id])

  useEffect(() => {
    if (profileUser) {
      fetchUserOrders()
    }
  }, [statusFilter, dateRange, customDateFrom, customDateTo, minAmount, maxAmount, paymentMethodFilter])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getUsers()
      const users = response.data.users || []
      const foundUser = users.find((u: any) => u.id === Number(params.id))
      
      if (foundUser) {
        setProfileUser({
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          phone: foundUser.phone,
          address: foundUser.address,
          city: foundUser.city,
          postal_code: foundUser.postal_code,
          country: foundUser.country,
          role: foundUser.role,
          created_at: foundUser.created_at,
        })
      } else {
        router.push('/admin/users')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserOrders = async () => {
    if (!profileUser) return
    
    setLoadingOrders(true)
    try {
      const response = await adminAPI.getAdminOrders()
      const allOrders = response.data.orders || []
      // Filter orders by user ID
      const userOrders = allOrders.filter((order: Order) => order.user_id === profileUser.id)
      setOrders(userOrders)
    } catch (error) {
      console.error('Failed to fetch user orders:', error)
      setOrders([])
    } finally {
      setLoadingOrders(false)
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

  const getPaymentMethods = () => {
    const methods = new Set<string>()
    orders.forEach(order => {
      if (order.payments && Array.isArray(order.payments)) {
        order.payments.forEach((payment: Payment) => {
          methods.add(payment.method)
        })
      }
    })
    return Array.from(methods)
  }

  const filteredOrders = orders.filter(order => {
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

    // Amount filters
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min) && order.total < min) {
        return false
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max) && order.total > max) {
        return false
      }
    }

    // Payment method filter
    if (paymentMethodFilter) {
      if (!order.payments || !Array.isArray(order.payments)) {
        return false
      }
      const hasPaymentMethod = order.payments.some((payment: Payment) => 
        payment.method.toLowerCase() === paymentMethodFilter.toLowerCase()
      )
      if (!hasPaymentMethod) {
        return false
      }
    }

    return true
  })

  const handlePrint = (order: UserOrder) => {
    const userName = profileUser?.name || 'User'
    const phone = profileUser?.phone || ''
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
                <div class="store-address">Order Receipt</div>
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
                  <span>User:</span>
                  <span>${userName}</span>
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

              ${order.payments && order.payments.length > 0 ? `
                <div class="divider"></div>
                <div class="payments">
                  ${order.payments.map((payment: Payment) => `
                    <div class="payment-row">
                      <span>${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}:</span>
                      <span>${payment.amount.toFixed(2)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-500 mb-4">User not found</p>
          <Link href="/admin/users" className="text-[#ff6b35] hover:underline">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
  const ordersCount = orders.length

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800',
      user: 'bg-gray-100 text-gray-800',
    }
    return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/users"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-600 mt-1">View user details and order history</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-6">
          {/* Profile Picture */}
          <div className="w-24 h-24 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-3xl font-bold">
              {profileUser.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* User Details */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">{profileUser.name}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(profileUser.role)}`}>
                {profileUser.role}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FiMail className="w-4 h-4" />
                  <span>{profileUser.email}</span>
                </div>
                {profileUser.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FiPhone className="w-4 h-4" />
                    <span>{profileUser.phone}</span>
                  </div>
                )}
                {(profileUser.address || profileUser.city) && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FiMapPin className="w-4 h-4" />
                    <span>
                      {profileUser.address || ''}
                      {profileUser.address && profileUser.city ? ', ' : ''}
                      {profileUser.city || ''}
                      {profileUser.postal_code ? ` ${profileUser.postal_code}` : ''}
                      {profileUser.country ? `, ${profileUser.country}` : ''}
                    </span>
                  </div>
                )}
                {profileUser.created_at && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FiCalendar className="w-4 h-4" />
                    <span>Member since {new Date(profileUser.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FiShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Total Orders:</span>
                  <span className="font-semibold text-gray-900">{ordersCount}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <FiDollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Total Spent:</span>
                  <span className="font-semibold text-[#ff6b35]">৳{totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
          
          {/* Filters */}
          <div className="flex items-center flex-wrap gap-3 lg:flex-nowrap">
            {/* Search - First */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
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
            </div>

            {/* Custom Date Range */}
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
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
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
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment Method Filter */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
            >
              <option value="">All Methods</option>
              {getPaymentMethods().map(method => (
                <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
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
                            {order.payments.map((payment: Payment, index: number) => (
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
          )}
        </div>
      </div>
    </div>
  )
}

