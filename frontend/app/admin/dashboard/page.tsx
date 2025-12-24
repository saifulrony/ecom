'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  FiUsers, FiPackage, FiShoppingCart, FiDollarSign, FiTrendingUp,
  FiAlertCircle, FiArrowUp, FiArrowDown, FiEye
} from 'react-icons/fi'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, Order, Product } from '@/lib/api'

interface DashboardStats {
  total_users: number
  total_products: number
  total_orders: number
  total_revenue: number
  pending_orders?: number
  low_stock_items?: number
}

interface TopProduct {
  product_id: number
  product_name: string
  total_sold: number
  total_revenue: number
  image: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, token, logout } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [salesData, setSalesData] = useState<Array<{ date: string; sales: number }>>([])
  const [ordersData, setOrdersData] = useState<Array<{ date: string; orders: number }>>([])
  const [statusData, setStatusData] = useState<Array<{ status: string; count: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    const userRole = user.role?.toLowerCase()
    if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
      router.push('/admin/login')
      return
    }

    fetchDashboardData()
  }, [user, token, router])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes, topProductsRes, lowStockRes, salesRes, ordersChartRes, statusRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getRecentOrders(),
        adminAPI.getTopProducts(),
        adminAPI.getLowStockProducts(),
        adminAPI.getSalesChartData(30),
        adminAPI.getOrdersChartData(30),
        adminAPI.getStatusChartData(),
      ])

      setStats(statsRes.data)
      setRecentOrders(ordersRes.data.orders || [])
      setTopProducts(topProductsRes.data.products || [])
      setLowStockProducts(lowStockRes.data.products || [])
      setSalesData(salesRes.data.data || [])
      setOrdersData(ordersChartRes.data.data || [])
      setStatusData(statusRes.data.data || [])
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
        router.push('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name || 'Admin'}</h1>
            <p className="text-gray-600 mt-1">
              You have {stats?.total_orders || 0}+ Orders, Today
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`৳${((stats?.total_revenue || 0) / 1000).toFixed(0)}K`}
          change="+22%"
          changeType="up"
          icon={<FiDollarSign className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Total Orders"
          value={stats?.total_orders || 0}
          change="+15%"
          changeType="up"
          icon={<FiShoppingCart className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Total Products"
          value={stats?.total_products || 0}
          change="+8%"
          changeType="up"
          icon={<FiPackage className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          change="+12%"
          changeType="up"
          icon={<FiUsers className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Over Time (Last 30 Days)</h2>
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

        {/* Status Pie Chart */}
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
                  {statusData.map((entry, index) => {
                    const colors = ['#ff6b35', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  })}
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
      </div>

      {/* Orders Column Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders Over Time (Last 30 Days)</h2>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
              <Link href="/admin/orders" className="text-sm text-[#ff6b35] hover:underline">
                View All
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.length > 0 ? (
                  recentOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.user?.name || `User #${order.user_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ৳{order.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No recent orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Selling Products</h2>
          </div>
          <div className="p-6 space-y-4">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={product.product_id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.product_name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiPackage className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.product_name}</p>
                    <p className="text-xs text-gray-500">{product.total_sold} sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">৳{product.total_revenue.toFixed(0)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center">No sales data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Products */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Low Stock Products</h2>
              <Link href="/admin/products" className="text-sm text-[#ff6b35] hover:underline">
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={200}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiPackage className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">ID: #{product.id}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-600">Stock: {product.stock}</span>
                    <span className="text-xs text-gray-500">৳{product.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/products"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Products</h3>
              <p className="text-sm text-gray-500">Add, edit, or delete products</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/orders"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Orders</h3>
              <p className="text-sm text-gray-500">View and update order status</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/users"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-500">View all registered users</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  color 
}: { 
  title: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down'
  icon: React.ReactNode
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        {change && (
          <div className={`flex items-center space-x-1 text-sm ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'up' ? <FiArrowUp /> : <FiArrowDown />}
            <span>{change}</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
