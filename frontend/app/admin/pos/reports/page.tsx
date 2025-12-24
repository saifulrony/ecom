'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FiBarChart2, FiDollarSign, FiShoppingCart, FiTrendingUp, 
  FiUsers, FiPackage, FiClock, FiCheckCircle
} from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface DashboardStats {
  total_revenue?: number
  total_orders?: number
  total_customers?: number
  total_products?: number
  today_revenue?: number
  today_orders?: number
  pending_orders?: number
  completed_orders?: number
}

interface POSOrder {
  id: number
  total: number
  status: string
  created_at: string
  is_fully_paid: boolean
}

export default function POSReportsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({})
  const [posOrders, setPosOrders] = useState<POSOrder[]>([])
  const [posStats, setPosStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    todayRevenue: 0,
    todayOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
  })

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      if (user && token) {
        const userRole = user.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }
        fetchData()
        return
      }

      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!storedToken) {
        router.push('/admin/login')
        return
      }

      const timer = setTimeout(async () => {
        const currentUser = useAuthStore.getState().user
        const currentToken = useAuthStore.getState().token
        
        if (!currentUser || !currentToken) {
          try {
            const { authAPI } = await import('@/lib/api')
            const profileResponse = await authAPI.getProfile()
            const profileUser = profileResponse.data
            const userRole = profileUser.role?.toLowerCase()
            
            if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
              router.push('/admin/login')
              return
            }
            
            useAuthStore.getState().setAuth(profileUser, storedToken)
            fetchData()
          } catch (err) {
            console.error('Failed to fetch profile:', err)
            router.push('/admin/login')
          }
          return
        }

        const userRole = currentUser.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }

        fetchData()
      }, 100)

      return () => clearTimeout(timer)
    }

    checkAuth()
  }, [user, token, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard stats
      try {
        const statsResponse = await adminAPI.getDashboardStats()
        setStats(statsResponse.data || {})
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      }

      // Fetch POS orders for POS-specific stats
      try {
        const ordersResponse = await adminAPI.getPOSOrders({ limit: 1000 })
        const orders = ordersResponse.data.orders || []
        setPosOrders(orders)

        // Calculate POS-specific stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayOrders = orders.filter((order: POSOrder) => {
          const orderDate = new Date(order.created_at)
          orderDate.setHours(0, 0, 0, 0)
          return orderDate.getTime() === today.getTime()
        })

        const totalRevenue = orders.reduce((sum: number, order: POSOrder) => sum + (order.total || 0), 0)
        const todayRevenue = todayOrders.reduce((sum: number, order: POSOrder) => sum + (order.total || 0), 0)
        const paidOrders = orders.filter((order: POSOrder) => order.is_fully_paid).length
        const pendingOrders = orders.filter((order: POSOrder) => !order.is_fully_paid).length

        setPosStats({
          totalRevenue,
          totalOrders: orders.length,
          todayRevenue,
          todayOrders: todayOrders.length,
          paidOrders,
          pendingOrders,
        })
      } catch (error) {
        console.error('Failed to fetch POS orders:', error)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total POS Revenue',
      value: `৳${posStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: FiDollarSign,
      color: 'bg-green-500',
      change: posStats.totalOrders > 0 ? `${posStats.totalOrders} orders` : 'No orders',
    },
    {
      title: 'Today\'s Revenue',
      value: `৳${posStats.todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: FiTrendingUp,
      color: 'bg-blue-500',
      change: `${posStats.todayOrders} orders today`,
    },
    {
      title: 'Total POS Orders',
      value: posStats.totalOrders.toString(),
      icon: FiShoppingCart,
      color: 'bg-purple-500',
      change: `${posStats.paidOrders} fully paid`,
    },
    {
      title: 'Pending Payments',
      value: posStats.pendingOrders.toString(),
      icon: FiClock,
      color: 'bg-yellow-500',
      change: posStats.pendingOrders > 0 ? 'Requires attention' : 'All paid',
    },
    {
      title: 'Total Customers',
      value: (stats.total_customers || 0).toString(),
      icon: FiUsers,
      color: 'bg-indigo-500',
      change: 'Registered users',
    },
    {
      title: 'Total Products',
      value: (stats.total_products || 0).toString(),
      icon: FiPackage,
      color: 'bg-pink-500',
      change: 'In inventory',
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#ff6b35] rounded-lg flex items-center justify-center">
            <FiBarChart2 className="text-gray-200 text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">POS Reports</h1>
            <p className="text-sm text-gray-600">Important statistics and insights</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="text-white text-xl" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            )
          })}
        </div>

        {/* Additional Stats Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FiCheckCircle className="text-green-500" />
                    <span className="text-sm text-gray-600">Fully Paid Orders</span>
                  </div>
                  <span className="font-semibold text-gray-900">{posStats.paidOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FiClock className="text-yellow-500" />
                    <span className="text-sm text-gray-600">Pending Payments</span>
                  </div>
                  <span className="font-semibold text-gray-900">{posStats.pendingOrders}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Order Value</span>
                  <span className="font-semibold text-gray-900">
                    {posStats.totalOrders > 0
                      ? `৳${(posStats.totalRevenue / posStats.totalOrders).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '৳0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Payment Completion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {posStats.totalOrders > 0
                      ? `${((posStats.paidOrders / posStats.totalOrders) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

