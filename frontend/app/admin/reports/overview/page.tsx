'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiBarChart2, FiTrendingUp, FiDollarSign, FiShoppingCart, FiUsers, FiPackage, FiTrendingDown } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ReportsOverviewPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [salesData, setSalesData] = useState<Array<{ date: string; sales: number }>>([])
  const [ordersData, setOrdersData] = useState<Array<{ date: string; orders: number }>>([])
  const [statusData, setStatusData] = useState<Array<{ status: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchData()
  }, [user, token, router, dateRange])

  const fetchData = async () => {
    try {
      const [statsRes, salesRes, ordersRes, statusRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getSalesChartData(Number(dateRange)),
        adminAPI.getOrdersChartData(Number(dateRange)),
        adminAPI.getStatusChartData(),
      ])

      setStats(statsRes.data)
      setSalesData(salesRes.data.data || [])
      setOrdersData(ordersRes.data.data || [])
      setStatusData(statusRes.data.data || [])
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

  const averageOrderValue = stats?.total_orders > 0 ? (stats.total_revenue / stats.total_orders) : 0
  const revenueGrowth = 22 // This would be calculated from historical data
  const ordersGrowth = 15
  const usersGrowth = 12

  const COLORS = ['#ff6b35', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Overview</h1>
          <p className="text-gray-600 mt-1">Comprehensive analytics and insights</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              <span>{Math.abs(revenueGrowth)}%</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">৳{((stats?.total_revenue || 0) / 1000).toFixed(0)}K</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {ordersGrowth >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              <span>{Math.abs(ordersGrowth)}%</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {usersGrowth >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              <span>{Math.abs(usersGrowth)}%</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiBarChart2 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <FiTrendingUp />
              <span>8%</span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Order Value</h3>
          <p className="text-2xl font-bold text-gray-900">৳{averageOrderValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Line Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h2>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`৳${value.toFixed(2)}`, 'Sales']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#ff6b35" 
                  strokeWidth={2}
                  name="Sales"
                  dot={{ fill: '#ff6b35', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No sales data available
            </div>
          )}
        </div>

        {/* Orders Column Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h2>
          {ordersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Orders']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No orders data available
            </div>
          )}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No status data available
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <FiPackage className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_products || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
              <p className="text-2xl font-bold text-gray-900">{stats?.pending_orders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiPackage className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
              <p className="text-2xl font-bold text-gray-900">{stats?.low_stock_items || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

