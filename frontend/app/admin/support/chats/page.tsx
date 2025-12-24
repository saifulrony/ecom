'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiMessageCircle, FiUser, FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiSearch } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

interface Chat {
  id: number
  user_id: number
  user_name: string
  user_email: string
  status: 'active' | 'resolved' | 'pending'
  last_message: string
  last_message_time: string
  created_at: string
  message_count: number
  support_staff_id?: number
  support_staff_name?: string
  support_staff_email?: string
}

export default function SupportChatsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [chats, setChats] = useState<Chat[]>([])
  const [filteredChats, setFilteredChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchChats()
  }, [user, token, router, dateRange])

  const fetchChats = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockChats: Chat[] = [
        {
          id: 1,
          user_id: 1,
          user_name: 'John Doe',
          user_email: 'john@example.com',
          status: 'active',
          last_message: 'I need help with my order',
          last_message_time: new Date().toISOString(),
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          message_count: 5,
          support_staff_id: 10,
          support_staff_name: 'Sarah Johnson',
          support_staff_email: 'sarah@example.com',
        },
        {
          id: 2,
          user_id: 2,
          user_name: 'Jane Smith',
          user_email: 'jane@example.com',
          status: 'resolved',
          last_message: 'Thank you for your help!',
          last_message_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          message_count: 12,
          support_staff_id: 11,
          support_staff_name: 'Mike Wilson',
          support_staff_email: 'mike@example.com',
        },
        {
          id: 3,
          user_id: 3,
          user_name: 'Bob Johnson',
          user_email: 'bob@example.com',
          status: 'pending',
          last_message: 'When will my order arrive?',
          last_message_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          message_count: 3,
        },
        {
          id: 4,
          user_id: 4,
          user_name: 'Alice Brown',
          user_email: 'alice@example.com',
          status: 'active',
          last_message: 'I have a question about my refund',
          last_message_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          message_count: 8,
          support_staff_id: 10,
          support_staff_name: 'Sarah Johnson',
          support_staff_email: 'sarah@example.com',
        },
        {
          id: 5,
          user_id: 5,
          user_name: 'Charlie Davis',
          user_email: 'charlie@example.com',
          status: 'resolved',
          last_message: 'Issue resolved, thank you!',
          last_message_time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          message_count: 15,
          support_staff_id: 12,
          support_staff_name: 'Emily Chen',
          support_staff_email: 'emily@example.com',
        },
      ]
      setChats(mockChats)
      setFilteredChats(mockChats)
    } catch (error) {
      console.error('Failed to fetch chats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...chats]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(chat =>
        chat.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.last_message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(chat => chat.status === statusFilter)
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'yesterday':
          filterDate.setDate(filterDate.getDate() - 1)
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1)
          break
      }

      filtered = filtered.filter(chat => {
        const chatDate = new Date(chat.created_at)
        return chatDate >= filterDate
      })
    }

    setFilteredChats(filtered)
  }, [chats, searchQuery, statusFilter, dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString)
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { timePart, datePart }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Chats</h1>
        <p className="text-gray-600 mt-1">Manage customer support conversations</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center flex-wrap gap-3 lg:flex-nowrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by customer name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Chats Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Chats ({filteredChats.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Support Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => {
                  const { timePart, datePart } = formatTableDate(chat.created_at)
                  return (
                    <tr key={chat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{timePart}</span>
                          <span className="text-xs text-gray-600">{datePart}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/admin/customers/${chat.user_id}`}
                          className="flex items-center space-x-3 hover:opacity-80 transition"
                        >
                          <div className="w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {chat.user_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 hover:text-[#ff6b35] transition">
                              {chat.user_name}
                            </p>
                            <p className="text-xs text-gray-500">{chat.user_email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {chat.support_staff_id ? (
                          <Link
                            href={`/admin/users/${chat.support_staff_id}`}
                            className="flex items-center space-x-3 hover:opacity-80 transition"
                          >
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {chat.support_staff_name?.charAt(0).toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 hover:text-[#ff6b35] transition">
                                {chat.support_staff_name}
                              </p>
                              <p className="text-xs text-gray-500">{chat.support_staff_email}</p>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <FiUser className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-400">Unassigned</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(chat.status)}`}>
                          {chat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 font-medium">{chat.message_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 truncate max-w-xs">{chat.last_message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(chat.last_message_time)}</p>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No chats found
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

