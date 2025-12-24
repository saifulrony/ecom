'use client'

import { useEffect, useState, useRef } from 'react'
import { FiMessageCircle, FiUser, FiSearch, FiSend, FiCheckCircle, FiClock, FiX, FiMoreVertical, FiArchive } from 'react-icons/fi'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { adminAPI } from '@/lib/api'

interface ChatMessage {
  id: number
  sender: 'user' | 'ai'
  message: string
  created_at: string
}

interface Chat {
  id: number
  user_id: number | null
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
  const { isAuthenticated } = useAdminAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'pending'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchChats()
    }
  }, [isAuthenticated, statusFilter])

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id)
      // Auto-refresh messages every 5 seconds for real-time updates
      const interval = setInterval(() => {
        fetchMessages(selectedChat.id, true) // Silent refresh
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChats = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      const response = await adminAPI.getChats(params)
      const chatData = response.data.chats || []
      
      const transformedChats: Chat[] = chatData.map((chat: any) => ({
        id: chat.id,
        user_id: chat.user_id || null,
        user_name: chat.user_name || 'Anonymous',
        user_email: chat.user_email || 'N/A',
        status: chat.status || 'active',
        last_message: chat.last_message || '',
        last_message_time: chat.last_message_time || chat.created_at,
        created_at: chat.created_at,
        message_count: chat.message_count || 0,
        support_staff_id: chat.support_staff_id,
        support_staff_name: chat.support_staff_name,
        support_staff_email: chat.support_staff_email,
      }))
      
      setChats(transformedChats)
      
      // If no chat selected, select the first one
      if (!selectedChat && transformedChats.length > 0) {
        setSelectedChat(transformedChats[0])
      } else if (selectedChat) {
        // Update selected chat if it's in the list
        const updated = transformedChats.find(c => c.id === selectedChat.id)
        if (updated) setSelectedChat(updated)
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (chatId: number, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true)
      const response = await adminAPI.getChatMessages(chatId)
      const messagesData = response.data.messages || []
      
      const transformedMessages: ChatMessage[] = messagesData.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender as 'user' | 'ai',
        message: msg.message,
        created_at: msg.created_at,
      }))
      
      setMessages(transformedMessages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      if (!silent) setMessagesLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || sending) return

    try {
      setSending(true)
      await adminAPI.sendChatMessage(selectedChat.id, messageInput.trim())
      setMessageInput('')
      
      // Refresh messages and chats
      await fetchMessages(selectedChat.id)
      await fetchChats()
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (chatId: number, newStatus: 'active' | 'resolved' | 'pending') => {
    try {
      await adminAPI.updateChatStatus(chatId, newStatus)
      await fetchChats()
      if (selectedChat?.id === chatId) {
        setSelectedChat({ ...selectedChat, status: newStatus })
      }
    } catch (error) {
      console.error('Failed to update chat status:', error)
    }
  }

  const filteredChats = chats.filter(chat =>
    chat.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'resolved': return 'bg-gray-400'
      case 'pending': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Support Chats</h1>
        <p className="text-gray-600 mt-1">Manage customer support conversations</p>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Left Sidebar - Chat List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex gap-2">
              {(['all', 'active', 'pending', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                    statusFilter === status
                      ? 'bg-[#ff6b35] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-[#ff6b35]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="relative">
                        <div className="w-12 h-12 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm">
                            {chat.user_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(chat.status)} rounded-full border-2 border-white`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {chat.user_name}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTime(chat.last_message_time)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate mb-1">
                          {chat.user_email}
                        </p>
                        <p className="text-sm text-gray-700 truncate">
                          {chat.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {chat.message_count > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {chat.message_count} message{chat.message_count !== 1 ? 's' : ''}
                      </span>
                      {chat.support_staff_name && (
                        <span className="text-xs text-blue-600">
                          Assigned to {chat.support_staff_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <FiMessageCircle className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-sm">No chats found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Messages */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {selectedChat.user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(selectedChat.status)} rounded-full border-2 border-white`}></div>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedChat.user_name}</h2>
                      <p className="text-sm text-gray-600">{selectedChat.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Status Dropdown */}
                    <select
                      value={selectedChat.status}
                      onChange={(e) => handleStatusChange(selectedChat.id, e.target.value as 'active' | 'resolved' | 'pending')}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-gray-50"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff6b35]"></div>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.sender === 'user'
                              ? 'bg-[#ff6b35] text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                            }`}
                          >
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FiMessageCircle className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="bg-[#ff6b35] text-white rounded-lg px-6 py-2 hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <FiSend className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <FiMessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a chat to view messages</p>
                <p className="text-sm mt-2">Choose a conversation from the left sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
