'use client'

import { useEffect, useState } from 'react'
import { FiUsers, FiUserCheck, FiShoppingCart, FiDollarSign, FiTrendingUp } from 'react-icons/fi'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { adminAPI, Order } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ReportsUsersPage() {
  const { isAuthenticated } = useAdminAuth()
  const [stats, setStats] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    try {
      const [statsRes, customersRes, ordersRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getCustomers(),
        adminAPI.getAdminOrders(),
      ])

      setStats(statsRes.data)
      // getCustomers returns array directly, not wrapped in object
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : [])
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

  // Calculate active customers (customers with at least one order)
  const activeCustomers = customers.filter(c => {
    return allOrders.some(o => o.user_id === c.id)
  }).length

  // Calculate new customers (joined in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const newCustomers = customers.filter(c => {
    const createdDate = new Date(c.created_at)
    return createdDate >= thirtyDaysAgo
  }).length

  // Calculate total customer orders and revenue
  const customerOrders = allOrders.filter(o => 
    customers.some(c => c.id === o.user_id)
  )
  const totalCustomerRevenue = customerOrders.reduce((sum, o) => sum + o.total, 0)

  // Top customers by revenue
  const customerRevenue = customers
    .map(c => {
      const userOrders = allOrders.filter(o => o.user_id === c.id)
      return {
        name: c.name,
        email: c.email,
        revenue: userOrders.reduce((sum, o) => sum + o.total, 0),
        orders: userOrders.length,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Reports</h1>
        <p className="text-gray-600 mt-1">Customer analytics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Customers</h3>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <FiUserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Customers</h3>
          <p className="text-2xl font-bold text-gray-900">{activeCustomers}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">New Customers (30d)</h3>
          <p className="text-2xl font-bold text-gray-900">{newCustomers}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">৳{totalCustomerRevenue.toFixed(2)}</p>
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

      {/* Customer Stats Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customer Statistics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">{customers.length}</span>
                  </td>
                <td className="px-6 py-4 text-sm text-gray-900">{activeCustomers}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{customerOrders.length}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#ff6b35]">
                  ৳{totalCustomerRevenue.toFixed(2)}
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

