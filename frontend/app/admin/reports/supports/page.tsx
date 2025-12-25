'use client'

import { useEffect, useState } from 'react'
import { FiMessageCircle, FiFileText, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { adminAPI } from '@/lib/api'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Chat {
  id: number
  user_id: number | null
  user_name: string
  user_email: string
  status: 'active' | 'resolved' | 'pending'
  created_at: string
  message_count: number
  last_message_time?: string
}

export default function ReportsSupportsPage() {
  const { isAuthenticated } = useAdminAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [activeTab, setActiveTab] = useState<'chats' | 'tickets'>('chats')

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch all chats (no status filter for reports)
      const response = await adminAPI.getChats()
      const chatData = response.data.chats || []
      
      // Filter by date range
      const days = parseInt(dateRange)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const filteredChats = chatData.filter((chat: any) => {
        const chatDate = new Date(chat.created_at)
        return chatDate >= cutoffDate
      })
      
      const transformedChats: Chat[] = filteredChats.map((chat: any) => ({
        id: chat.id,
        user_id: chat.user_id || null,
        user_name: chat.user_name || 'Anonymous',
        user_email: chat.user_email || 'N/A',
        status: chat.status || 'active',
        created_at: chat.created_at,
        message_count: chat.message_count || 0,
        last_message_time: chat.last_message_time,
      }))

      setChats(transformedChats)
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

  // Calculate statistics
  const totalChats = chats.length
  const activeChats = chats.filter(c => c.status === 'active').length
  const resolvedChats = chats.filter(c => c.status === 'resolved').length
  const pendingChats = chats.filter(c => c.status === 'pending').length
  const totalMessages = chats.reduce((sum, c) => sum + c.message_count, 0)
  
  // Calculate average response time (time between first and last message per chat)
  const calculateAvgResponseTime = () => {
    if (chats.length === 0) return 0
    // This is a simplified calculation - in a real scenario, you'd fetch message timestamps
    // For now, we'll estimate based on chat creation to last message time
    const timesWithMessages = chats.filter(c => c.message_count > 1 && c.last_message_time)
    if (timesWithMessages.length === 0) return 0
    
    const totalMinutes = timesWithMessages.reduce((sum, chat) => {
      const created = new Date(chat.created_at).getTime()
      const lastMessage = new Date(chat.last_message_time!).getTime()
      const diffMinutes = (lastMessage - created) / (1000 * 60)
      return sum + diffMinutes
    }, 0)
    
    return Math.round(totalMinutes / timesWithMessages.length)
  }
  const avgResponseTime = calculateAvgResponseTime()

  // Chat status distribution
  const chatStatusData = [
    { name: 'Active', value: activeChats },
    { name: 'Resolved', value: resolvedChats },
    { name: 'Pending', value: pendingChats },
  ]


  // Calculate chat activity over time
  const calculateActivityOverTime = () => {
    const days = parseInt(dateRange)
    const activityMap: { [key: string]: number } = {}
    
    // Initialize all days in the range with 0
    const today = new Date()
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      activityMap[dateKey] = 0
    }
    
    // Count chats per day
    chats.forEach(chat => {
      const chatDate = new Date(chat.created_at).toISOString().split('T')[0]
      if (activityMap.hasOwnProperty(chatDate)) {
        activityMap[chatDate]++
      }
    })
    
    // Convert to array and sort by date
    return Object.keys(activityMap)
      .sort()
      .map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        chats: activityMap[date],
      }))
  }
  const supportActivityData = calculateActivityOverTime()

  const COLORS = ['#ff6b35', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Reports</h1>
          <p className="text-gray-600 mt-1">Analytics and insights for support operations</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chats'
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FiMessageCircle className="w-4 h-4" />
                <span>Chat Statistics</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tickets'
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FiFileText className="w-4 h-4" />
                <span>Ticket Statistics</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'chats' && (
        <>
          {/* Chat Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FiMessageCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Chats</h3>
              <p className="text-2xl font-bold text-gray-900">{totalChats}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Resolved Chats</h3>
              <p className="text-2xl font-bold text-gray-900">{resolvedChats}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <FiMessageCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Messages</h3>
              <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <FiClock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Response Time</h3>
              <p className="text-2xl font-bold text-gray-900">
                {avgResponseTime > 60 ? `${Math.round(avgResponseTime / 60)}h` : `${avgResponseTime}m`}
              </p>
            </div>
          </div>

          {/* Chat Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat Statistics</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Active</p>
                <p className="text-2xl font-bold text-blue-600">{activeChats}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{resolvedChats}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingChats}</p>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Messages</span>
                <span className="text-sm font-semibold text-gray-900">{totalMessages}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Messages per Chat</span>
                <span className="text-sm font-semibold text-gray-900">
                  {totalChats > 0 ? (totalMessages / totalChats).toFixed(1) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Chat Resolution Rate</span>
                <span className="text-sm font-semibold text-[#ff6b35]">
                  {totalChats > 0 ? ((resolvedChats / totalChats) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            {chatStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chatStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chatStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {/* Chat Activity Over Time */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat Activity Over Time</h2>
            {supportActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={supportActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="chats" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Chats"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No activity data available
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'tickets' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ticket System Not Available</h3>
            <p className="text-sm">The ticket system is not currently implemented. Only chat support is available.</p>
          </div>
          </div>
      )}
    </div>
  )
}

