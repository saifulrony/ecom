'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiSearch, FiUser, FiMail, FiCalendar, FiEye } from 'react-icons/fi'
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
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    // Only admin can view users
    if (user.role?.toLowerCase() !== 'admin') {
      router.push('/admin/dashboard')
      return
    }

    fetchUsers()
  }, [user, token, router])

  const fetchUsers = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getAdminOrders(),
      ])
      
      const allUsers = usersRes.data.users || []
      const orders = ordersRes.data.orders || []
      setAllOrders(orders)
      
      // Calculate orders_count and total_spent for each user
      const usersWithStats = allUsers.map((u: any) => {
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
      
      setUsers(usersWithStats)
    } catch (error) {
      console.error('Failed to fetch users:', error)
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

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800',
      user: 'bg-gray-100 text-gray-800',
    }
    return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  const filteredUsers = users.filter(u => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      if (!u.name.toLowerCase().includes(searchLower) &&
          !u.email.toLowerCase().includes(searchLower) &&
          !(u.phone && u.phone.toLowerCase().includes(searchLower))) {
        return false
      }
    }

    // Role filter
    if (roleFilter && u.role.toLowerCase() !== roleFilter.toLowerCase()) {
      return false
    }

    // Date range filter (based on joined date)
    const dateRangeFilter = getDateRange()
    if (dateRangeFilter) {
      const userDate = new Date(u.created_at)
      if (userDate < dateRangeFilter.from || userDate > dateRangeFilter.to) {
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
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600 mt-1">Manage system users and their roles</p>
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
                placeholder="Search users..."
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
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="user">User</option>
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter(u => u.role.toLowerCase() === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Customers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter(u => u.role.toLowerCase() === 'user').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {users.filter(u => ['manager', 'staff'].includes(u.role.toLowerCase())).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{(u as any).orders_count || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ৳{((u as any).total_spent || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(u.created_at)}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/users/${u.id}`}
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No users found
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

