'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiTarget, FiUsers, FiShoppingCart, FiDollarSign, FiEye } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, Order } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Campaign {
  id: number
  name: string
  code: string
  description?: string
  start_date: string
  end_date: string
  is_active: boolean
  unique_visitors: number
  total_orders: number
  total_revenue: number
  cart_additions: number
  conversion_rate: number
}

export default function CampaignReportsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
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
      // Fetch campaigns from API
      const campaignsRes = await adminAPI.getCampaigns()
      const fetchedCampaigns = campaignsRes.data.campaigns || []

      // Fetch orders to calculate campaign stats
      const ordersRes = await adminAPI.getAdminOrders()
      const orders = ordersRes.data.orders || []
      setAllOrders(orders)

      // Calculate stats for each campaign
      const campaignsWithStats = fetchedCampaigns.map((campaign: any) => {
        // Filter orders by campaign code (assuming orders have a campaign_code field)
        const campaignOrders = orders.filter((o: any) => 
          o.coupon_code === campaign.code || 
          o.notes?.includes(campaign.code) ||
          o.campaign_code === campaign.code
        )

        // Calculate unique visitors (unique user_ids)
        const uniqueUserIds = new Set(campaignOrders.map((o: Order) => o.user_id))
        const uniqueVisitors = uniqueUserIds.size

        // Calculate totals
        const totalOrders = campaignOrders.length
        const totalRevenue = campaignOrders.reduce((sum, o) => sum + o.total, 0)

        // Mock cart additions (in real app, this would come from analytics)
        const cartAdditions = Math.floor(uniqueVisitors * 1.5)

        // Calculate conversion rate
        const conversionRate = uniqueVisitors > 0 ? (totalOrders / uniqueVisitors) * 100 : 0

        return {
          ...campaign,
          start_date: campaign.start_date || campaign.startDate,
          end_date: campaign.end_date || campaign.endDate,
          is_active: campaign.is_active !== undefined ? campaign.is_active : campaign.isActive,
          unique_visitors: uniqueVisitors,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          cart_additions: cartAdditions,
          conversion_rate: conversionRate,
        }
      })

      setCampaigns(campaignsWithStats)
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

  // Calculate overall stats
  const totalUniqueVisitors = campaigns.reduce((sum, c) => sum + c.unique_visitors, 0)
  const totalOrders = campaigns.reduce((sum, c) => sum + c.total_orders, 0)
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.total_revenue, 0)
  const totalCartAdditions = campaigns.reduce((sum, c) => sum + c.cart_additions, 0)
  const overallConversionRate = totalUniqueVisitors > 0 ? (totalOrders / totalUniqueVisitors) * 100 : 0

  // Prepare chart data
  const campaignPerformanceData = campaigns.map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    visitors: c.unique_visitors,
    orders: c.total_orders,
    revenue: c.total_revenue,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Reports</h1>
          <p className="text-gray-600 mt-1">Monitor campaign performance and track conversions</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Unique Visitors</h3>
          <p className="text-2xl font-bold text-gray-900">{totalUniqueVisitors}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <FiShoppingCart className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">৳{totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiTarget className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Cart Additions</h3>
          <p className="text-2xl font-bold text-gray-900">{totalCartAdditions}</p>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Overall Conversion Rate</h3>
            <p className="text-3xl font-bold text-[#ff6b35] mt-2">{overallConversionRate.toFixed(2)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Orders / Visitors</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {totalOrders} / {totalUniqueVisitors}
            </p>
          </div>
        </div>
      </div>

      {/* Campaign Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h2>
        {campaignPerformanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
              <Bar dataKey="orders" fill="#10b981" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No campaign data available
          </div>
        )}
      </div>

      {/* Campaigns Stats Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Statistics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cart Additions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                        <p className="text-xs text-gray-500">{campaign.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        campaign.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{campaign.unique_visitors}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{campaign.total_orders}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#ff6b35]">৳{campaign.total_revenue.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{campaign.cart_additions}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{campaign.conversion_rate.toFixed(2)}%</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FiTarget className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No campaigns found</p>
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

