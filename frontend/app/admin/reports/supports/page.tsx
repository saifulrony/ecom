'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiHeadphones, FiMessageCircle, FiFileText, FiUsers, FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Chat {
  id: number
  user_id: number
  status: 'active' | 'resolved' | 'pending'
  created_at: string
  message_count: number
}

interface Ticket {
  id: number
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
}

export default function ReportsSupportsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [chats, setChats] = useState<Chat[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [activeTab, setActiveTab] = useState<'chats' | 'tickets'>('chats')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchData()
  }, [user, token, router, dateRange])

  const fetchData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockChats: Chat[] = [
        { id: 1, user_id: 1, status: 'active', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), message_count: 5 },
        { id: 2, user_id: 2, status: 'resolved', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), message_count: 12 },
        { id: 3, user_id: 3, status: 'pending', created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), message_count: 3 },
        { id: 4, user_id: 4, status: 'active', created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), message_count: 8 },
        { id: 5, user_id: 5, status: 'resolved', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), message_count: 15 },
      ]

      const mockTickets: Ticket[] = [
        { id: 1, status: 'open', priority: 'high', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: 2, status: 'in_progress', priority: 'medium', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
        { id: 3, status: 'resolved', priority: 'low', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
        { id: 4, status: 'open', priority: 'urgent', created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
        { id: 5, status: 'closed', priority: 'low', created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
      ]

      setChats(mockChats)
      setTickets(mockTickets)
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
  const avgResponseTime = 4.5 // Mock data

  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => t.status === 'open').length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length
  const closedTickets = tickets.filter(t => t.status === 'closed').length
  const urgentTickets = tickets.filter(t => t.priority === 'urgent').length
  const avgResolutionTime = 18.5 // Mock data

  // Chat status distribution
  const chatStatusData = [
    { name: 'Active', value: activeChats },
    { name: 'Resolved', value: resolvedChats },
    { name: 'Pending', value: pendingChats },
  ]

  // Ticket status distribution
  const ticketStatusData = [
    { name: 'Open', value: openTickets },
    { name: 'In Progress', value: inProgressTickets },
    { name: 'Resolved', value: resolvedTickets },
    { name: 'Closed', value: closedTickets },
  ]

  // Ticket priority distribution
  const ticketPriorityData = [
    { name: 'Low', value: tickets.filter(t => t.priority === 'low').length },
    { name: 'Medium', value: tickets.filter(t => t.priority === 'medium').length },
    { name: 'High', value: tickets.filter(t => t.priority === 'high').length },
    { name: 'Urgent', value: tickets.filter(t => t.priority === 'urgent').length },
  ]

  // Support activity over time (mock data)
  const supportActivityData = [
    { date: '2024-12-20', chats: 5, tickets: 3 },
    { date: '2024-12-21', chats: 8, tickets: 5 },
    { date: '2024-12-22', chats: 12, tickets: 7 },
    { date: '2024-12-23', chats: 10, tickets: 4 },
    { date: '2024-12-24', chats: 15, tickets: 6 },
  ]

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
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
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
              <p className="text-2xl font-bold text-gray-900">{avgResponseTime}m</p>
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
        <>
          {/* Ticket Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <FiFileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Tickets</h3>
              <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <FiAlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Open Tickets</h3>
              <p className="text-2xl font-bold text-gray-900">{openTickets}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <FiClock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Resolution Time</h3>
              <p className="text-2xl font-bold text-gray-900">{avgResolutionTime}h</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Resolution Rate</h3>
              <p className="text-2xl font-bold text-gray-900">
                {totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Ticket Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Statistics</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Open</p>
                <p className="text-2xl font-bold text-red-600">{openTickets}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{inProgressTickets}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{resolvedTickets}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Closed</p>
                <p className="text-2xl font-bold text-gray-600">{closedTickets}</p>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Urgent Tickets</span>
                <span className="text-sm font-semibold text-red-600">{urgentTickets}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Resolution Time</span>
                <span className="text-sm font-semibold text-gray-900">{avgResolutionTime}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ticket Resolution Rate</span>
                <span className="text-sm font-semibold text-[#ff6b35]">
                  {totalTickets > 0 ? (((resolvedTickets + closedTickets) / totalTickets) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            {ticketStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ticketStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {/* Ticket Activity Over Time */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Activity Over Time</h2>
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
                    dataKey="tickets" 
                    stroke="#ff6b35" 
                    strokeWidth={2}
                    name="Tickets"
                    dot={{ fill: '#ff6b35', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No activity data available
              </div>
            )}
          </div>

          {/* Ticket Priority Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Priority</h2>
            {ticketPriorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ticketPriorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#ff6b35" name="Tickets" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No priority data available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

