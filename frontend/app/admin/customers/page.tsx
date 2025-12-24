'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiSearch, FiUser, FiMail, FiShoppingCart, FiDollarSign, FiEye, FiCalendar } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, Order } from '@/lib/api'

interface Customer {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  created_at: string
  orders_count?: number
  total_spent?: number
  role?: string
}

export default function AdminCustomersPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchCustomers()
  }, [user, token, router])

  const fetchCustomers = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getAdminOrders(),
      ])
      
      // Filter only regular users (customers)
      const customerUsers = (usersRes.data.users || []).filter((u: any) => 
        u.role?.toLowerCase() === 'user'
      )
      
      // Calculate orders_count and total_spent from orders
      const orders = ordersRes.data.orders || []
      setAllOrders(orders)
      
      const customersWithStats = customerUsers.map((u: any) => {
        const userOrders = orders.filter((o: Order) => o.user_id === u.id)
        const ordersCount = userOrders.length
        const totalSpent = userOrders.reduce((sum: number, o: Order) => sum + o.total, 0)
        
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          city: u.city,
          postal_code: u.postal_code,
          country: u.country,
          role: u.role,
          created_at: u.created_at,
          orders_count: ordersCount,
          total_spent: totalSpent,
        }
      })
      
      setCustomers(customersWithStats)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredCustomers = customers.filter(customer => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      if (!customer.name.toLowerCase().includes(searchLower) &&
          !customer.email.toLowerCase().includes(searchLower) &&
          !(customer.phone && customer.phone.toLowerCase().includes(searchLower))) {
        return false
      }
    }

    // Role filter
    if (roleFilter && customer.role?.toLowerCase() !== roleFilter.toLowerCase()) {
      return false
    }

    // Date range filter (based on member since date)
    const dateRangeFilter = getDateRange()
    if (dateRangeFilter) {
      const customerDate = new Date(customer.created_at)
      if (customerDate < dateRangeFilter.from || customerDate > dateRangeFilter.to) {
        return false
      }
    }

    // Amount filters (based on total_spent)
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min) && (customer.total_spent || 0) < min) {
        return false
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max) && (customer.total_spent || 0) > max) {
        return false
      }
    }

    return true
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-1">Manage customer accounts and view their activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiUser className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {customers.filter(c => (c.orders_count || 0) > 0).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ৳{customers.reduce((sum, c) => sum + (c.total_spent || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center flex-wrap gap-3 lg:flex-nowrap">
          {/* Search - First */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
          >
            <option value="">All Roles</option>
            <option value="user">Customer</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <FiCalendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom</option>
            </select>
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
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.orders_count || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ৳{(customer.total_spent || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(customer.created_at)}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="inline-flex items-center space-x-1 text-[#ff6b35] hover:text-[#ff8c5a] transition"
                      >
                        <FiEye className="w-4 h-4" />
                        <span className="text-sm">View Profile</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

