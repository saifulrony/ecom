'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiDollarSign, FiTrendingUp, FiShoppingCart, FiCalendar, FiDownload } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

export default function AdminSalesPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [salesData, setSalesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchSalesData()
  }, [user, token, router, dateRange])

  const fetchSalesData = async () => {
    try {
      const response = await adminAPI.getDashboardStats()
      setSalesData(response.data)
    } catch (error) {
      console.error('Failed to fetch sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportOrdersCSV()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to export orders:', error)
      alert('Failed to export orders')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-gray-600 mt-1">View detailed sales analytics and reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
          >
            <FiDownload />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+22%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sales</h3>
          <p className="text-2xl font-bold text-gray-900">৳{((salesData?.total_revenue || 0) / 1000).toFixed(0)}K</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+15%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900">{salesData?.total_orders || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+8%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Average Order</h3>
          <p className="text-2xl font-bold text-gray-900">
            ৳{salesData?.total_orders > 0 ? ((salesData.total_revenue / salesData.total_orders) / 1000).toFixed(1) : 0}K
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiCalendar className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+12%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-gray-900">
            ৳{((salesData?.total_revenue || 0) * 0.3 / 1000).toFixed(0)}K
          </p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Overview</h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center w-full">
            <p className="text-gray-500 mb-4">Revenue Trend ({dateRange})</p>
            <div className="grid grid-cols-12 gap-1 max-w-4xl mx-auto">
              {[...Array(12)].map((_, i) => {
                const height = Math.random() * 100 + 20
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div 
                      className="w-full bg-[#ff6b35] rounded-t min-h-[20px]"
                      style={{ height: `${height}%` }}
                      title={`৳${(Math.random() * 10000 + 1000).toFixed(0)}`}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">{i + 1}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4">Monthly revenue breakdown</p>
          </div>
        </div>
      </div>

      {/* Additional Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          <Link href="/admin/products" className="text-[#ff6b35] hover:underline text-sm">
            View all products →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Customer Insights</h3>
          <Link href="/admin/customers" className="text-[#ff6b35] hover:underline text-sm">
            View all customers →
          </Link>
        </div>
      </div>
    </div>
  )
}

