'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUsers, FiUserCheck, FiShoppingCart, FiDollarSign, FiTrendingUp } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, Order } from '@/lib/api'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface UserStats {
  role: string
  count: number
  totalOrders: number
  totalRevenue: number
}

export default function ReportsUsersPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchData()
  }, [user, token, router])

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getUsers(),
        adminAPI.getAdminOrders(),
      ])

      setStats(statsRes.data)
      setAllUsers(usersRes.data.users || [])
      setAllOrders(ordersRes.data.orders || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  // Calculate user statistics by role
  const userStatsByRole: UserStats[] = []
  const roleGroups = ['admin', 'manager', 'staff', 'user']
  
  roleGroups.forEach(role => {
    const usersInRole = allUsers.filter(u => u.role?.toLowerCase() === role)
    const userOrders = allOrders.filter(o => 
      usersInRole.some(u => u.id === o.user_id)
    )
    const totalRevenue = userOrders.reduce((sum, o) => sum + o.total, 0)
    
    userStatsByRole.push({
      role: role.charAt(0).toUpperCase() + role.slice(1),
      count: usersInRole.length,
      totalOrders: userOrders.length,
      totalRevenue,
    })
  })

  // Calculate active users (users with at least one order)
  const activeUsers = allUsers.filter(u => {
    return allOrders.some(o => o.user_id === u.id)
  }).length

  // Calculate new users (joined in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const newUsers = allUsers.filter(u => {
    const createdDate = new Date(u.created_at)
    return createdDate >= thirtyDaysAgo
  }).length

  // Top customers by revenue
  const customerRevenue = allUsers
    .filter(u => u.role?.toLowerCase() === 'user')
    .map(u => {
      const userOrders = allOrders.filter(o => o.user_id === u.id)
      return {
        name: u.name,
        revenue: userOrders.reduce((sum, o) => sum + o.total, 0),
        orders: userOrders.length,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const COLORS = ['#ff6b35', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Reports</h1>
        <p className="text-gray-600 mt-1">User analytics and customer insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <FiUserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Users</h3>
          <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">New Users (30d)</h3>
          <p className="text-2xl font-bold text-gray-900">{newUsers}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Customers</h3>
          <p className="text-2xl font-bold text-gray-900">
            {allUsers.filter(u => u.role?.toLowerCase() === 'user').length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
          {userStatsByRole.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userStatsByRole}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, percent }) => `${role}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {userStatsByRole.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No user data available
            </div>
          )}
        </div>

        {/* Revenue by Role */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by User Role</h2>
          {userStatsByRole.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userStatsByRole}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="role" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`৳${value.toFixed(2)}`, 'Revenue']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#ff6b35" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No revenue data available
            </div>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Revenue</h2>
        {customerRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={customerRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [`৳${value.toFixed(2)}`, 'Revenue']}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No customer data available
          </div>
        )}
      </div>

      {/* User Stats Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Statistics by Role</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {userStatsByRole.map((stat) => (
                <tr key={stat.role} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{stat.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{stat.count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{stat.totalOrders}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#ff6b35]">
                    ৳{stat.totalRevenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

