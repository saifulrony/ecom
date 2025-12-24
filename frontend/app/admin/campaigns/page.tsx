'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiTarget, FiShoppingCart, FiChevronDown, FiCalendar, FiPlus, FiX } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, Order } from '@/lib/api'

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

interface CampaignOrder extends Order {
  campaign_code?: string
}

export default function CampaignsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignOrders, setCampaignOrders] = useState<CampaignOrder[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<number>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchData()
  }, [user, token, router])

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignOrders()
    }
  }, [selectedCampaign])

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

  const fetchCampaignOrders = async () => {
    if (!selectedCampaign) return

    setLoadingOrders(true)
    try {
      // Filter orders by campaign code
      const filteredOrders = allOrders.filter((o: any) => 
        o.coupon_code === selectedCampaign.code || 
        o.notes?.includes(selectedCampaign.code) ||
        o.campaign_code === selectedCampaign.code
      )
      setCampaignOrders(filteredOrders)
    } catch (error) {
      console.error('Failed to fetch campaign orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const toggleCampaignExpansion = (campaignId: number) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null)
      }
    } else {
      newExpanded.add(campaignId)
      const campaign = campaigns.find(c => c.id === campaignId)
      if (campaign) {
        setSelectedCampaign(campaign)
      }
    }
    setExpandedCampaigns(newExpanded)
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await adminAPI.createCampaign(formData)
      setShowCreateModal(false)
      setFormData({
        name: '',
        code: '',
        description: '',
        start_date: '',
        end_date: '',
        is_active: true,
      })
      await fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  const COLORS = ['#ff6b35', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString)
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { timePart, datePart }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Monitor campaign performance and track conversions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#e55a2b] transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Campaigns</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {campaigns.length > 0 ? (
            campaigns.map((campaign) => {
              const isExpanded = expandedCampaigns.has(campaign.id)
              return (
                <div key={campaign.id} className="p-6">
                  {/* Campaign Header */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleCampaignExpansion(campaign.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          campaign.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {campaign.code}
                        </span>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <FiCalendar className="w-3 h-3" />
                          <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 ml-4">
                      {/* Quick Stats */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Visitors</p>
                        <p className="text-lg font-bold text-gray-900">{campaign.unique_visitors}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Orders</p>
                        <p className="text-lg font-bold text-gray-900">{campaign.total_orders}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="text-lg font-bold text-[#ff6b35]">৳{campaign.total_revenue.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Conversion</p>
                        <p className="text-lg font-bold text-gray-900">{campaign.conversion_rate.toFixed(2)}%</p>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                        {isExpanded ? (
                          <FiChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {/* Detailed Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiUsers className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Unique Visitors</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{campaign.unique_visitors}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiShoppingCart className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Cart Additions</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{campaign.cart_additions}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiDollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Total Revenue</span>
                          </div>
                          <p className="text-2xl font-bold text-[#ff6b35]">৳{campaign.total_revenue.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiTarget className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{campaign.conversion_rate.toFixed(2)}%</p>
                        </div>
                      </div>

                      {/* Campaign Orders */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Orders from this Campaign</h4>
                        {loadingOrders ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6b35]"></div>
                          </div>
                        ) : campaignOrders.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {campaignOrders.map((order) => {
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
                                        <span className="text-sm text-gray-900">
                                          {order.user?.name || `User #${order.user_id}`}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                                          {order.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm font-semibold text-[#ff6b35]">৳{order.total.toFixed(2)}</span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FiShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No orders found for this campaign</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              <FiTarget className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No campaigns found</p>
              <p className="text-sm mt-2">Create your first campaign to start tracking performance</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create New Campaign</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  placeholder="e.g., SUMMER2024"
                />
                <p className="text-xs text-gray-500 mt-1">Unique code for tracking this campaign</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  placeholder="Campaign description..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active Campaign
                </label>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#e55a2b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

