'use client'

import { useState, useRef, useEffect } from 'react'
import { FiMessageCircle, FiX, FiSend, FiLoader, FiUser, FiMail, FiPower, FiHeadphones } from 'react-icons/fi'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai' | 'admin'
  timestamp: Date
  admin_user?: {
    id: number
    name: string
    email: string
  }
}

export default function ChatBox() {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<number | null>(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [hasShownGuestModal, setHasShownGuestModal] = useState(false)
  const [showEndChatModal, setShowEndChatModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    
    // Load chat_id from localStorage and fetch messages if chat exists
    // If localStorage is cleared, try to find active chat by IP address (backend fallback)
    if (isOpen && typeof window !== 'undefined') {
      const savedChatId = localStorage.getItem('chat_id')
      if (savedChatId) {
        const id = parseInt(savedChatId, 10)
        if (!isNaN(id) && id > 0) {
          setChatId(id)
          // Load existing messages for this chat
          loadChatMessages(id)
        } else {
          // Invalid chat_id, try to find active chat by IP
          findActiveChat()
        }
      } else {
        // No chat_id in localStorage, try to find active chat by IP (fallback when localStorage is cleared)
        findActiveChat()
      }
    }
  }, [isOpen])

  const findActiveChat = async () => {
    try {
      const response = await api.get('/chat/active')
      if (response.data.chat_id) {
        const id = response.data.chat_id
        setChatId(id)
        if (typeof window !== 'undefined') {
          localStorage.setItem('chat_id', id.toString())
        }
        // Load existing messages for this chat
        loadChatMessages(id)
      }
    } catch (error) {
      // No active chat found (404) - this is normal for first-time users
      // Just start with default welcome message
      console.log('No active chat found, starting new conversation')
      setMessages([
        {
          id: '1',
          text: 'Hello! I\'m your AI assistant. How can I help you today?',
          sender: 'ai',
          timestamp: new Date(),
        },
      ])
    }
  }

  const loadChatMessages = async (id: number) => {
    try {
      const response = await api.get(`/chat/${id}`)
      if (response.data.messages && response.data.messages.length > 0) {
        const loadedMessages: Message[] = response.data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.message,
          sender: msg.sender as 'user' | 'ai' | 'admin',
          timestamp: new Date(msg.created_at),
          admin_user: msg.admin_user ? {
            id: msg.admin_user.id,
            name: msg.admin_user.name,
            email: msg.admin_user.email,
          } : undefined,
        }))
        setMessages(loadedMessages)
      }
    } catch (error) {
      // If chat not found or error, start fresh (chat_id might be invalid)
      console.error('Failed to load chat messages:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chat_id')
      }
      setChatId(null)
      setMessages([
        {
          id: '1',
          text: 'Hello! I\'m your AI assistant. How can I help you today?',
          sender: 'ai',
          timestamp: new Date(),
        },
      ])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Always check localStorage first as source of truth
      let currentChatId: number | null = null
      if (typeof window !== 'undefined') {
        const savedChatId = localStorage.getItem('chat_id')
        if (savedChatId) {
          const id = parseInt(savedChatId, 10)
          if (!isNaN(id) && id > 0) {
            currentChatId = id
            // Sync state with localStorage
            if (chatId !== id) {
              setChatId(id)
            }
          }
        }
      }
      
      const requestData: any = {
        message: userMessage.text,
      }
      
      // Always include chat_id from localStorage if available (source of truth)
      if (currentChatId) {
        requestData.chat_id = currentChatId
      }
      
      // Include guest info if user is not authenticated (guest user)
      if (!user && (guestName || guestEmail)) {
        if (guestName) requestData.guest_name = guestName
        if (guestEmail) requestData.guest_email = guestEmail
      }
      
      const response = await api.post('/chat', requestData)

      // Always save chat_id from response to keep it in sync
      if (response.data.chat_id) {
        const responseChatId = response.data.chat_id
        setChatId(responseChatId)
        if (typeof window !== 'undefined') {
          localStorage.setItem('chat_id', responseChatId.toString())
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response || 'I apologize, but I couldn\'t process your request.',
        sender: 'ai',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      
      // Show guest info modal after first AI response (only for guest users)
      if (!user && !hasShownGuestModal && !guestName && !guestEmail) {
        setShowGuestModal(true)
        setHasShownGuestModal(true)
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      let errorText = 'Sorry, I encountered an error. Please try again later.'
      
      // Provide more specific error messages
      if (error.response?.status === 500) {
        errorText = 'Server error. Please make sure the backend is running and database is migrated.'
      } else if (error.response?.status === 400) {
        errorText = error.response?.data?.error || 'Invalid request. Please check your message.'
      } else if (error.response?.data?.error) {
        errorText = error.response.data.error
      } else if (error.message) {
        errorText = `Error: ${error.message}`
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleGuestInfoSubmit = () => {
    // Email is required, name is optional
    if (guestEmail.trim()) {
      setShowGuestModal(false)
      // Guest info will be sent with next message
    }
  }

  const handleSkipGuestInfo = () => {
    setShowGuestModal(false)
    setHasShownGuestModal(true) // Mark as shown so it doesn't appear again
  }

  const handleEndChatClick = () => {
    // Show confirmation modal instead of ending immediately
    setShowEndChatModal(true)
  }

  const handleEndChatConfirm = async (issueResolved: boolean) => {
    if (!chatId) return

    setShowEndChatModal(false)

    // If issue is not resolved, escalate instead of ending
    if (!issueResolved) {
      await handleEscalateToSupport()
      return
    }

    // Issue is resolved, end the chat
    try {
      await api.post(`/chat/${chatId}/end`)
      
      // Add thank you message
      const thankYouMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thank you for contacting us! We\'re glad we could help. If you need further assistance, feel free to start a new chat.',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, thankYouMessage])
      
      // Clear chat state after a short delay
      setTimeout(() => {
        setChatId(null)
        setMessages([
          {
            id: '1',
            text: 'Chat ended. Start a new conversation by sending a message below!',
            sender: 'ai',
            timestamp: new Date(),
          },
        ])
        
        // Clear chat_id from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chat_id')
        }
        
        // Reset guest info flags so modal can appear again for new chat
        setHasShownGuestModal(false)
        setGuestName('')
        setGuestEmail('')
      }, 2000)
    } catch (error: any) {
      console.error('Failed to end chat:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.response?.data?.error || 'Failed to end chat. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleEscalateToSupport = async () => {
    if (!chatId) return

    try {
      const response = await api.post(`/chat/${chatId}/escalate`)
      
      // Add system message about escalation
      const escalationMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Your chat has been escalated to our support team. A support agent will respond shortly.',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, escalationMessage])
    } catch (error: any) {
      console.error('Failed to escalate chat:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.response?.data?.error || 'Failed to escalate chat. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#ff6b35] text-white rounded-full shadow-lg hover:bg-[#ff8c5a] transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
          aria-label="Open chat"
        >
          <FiMessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* End Chat Confirmation Modal */}
      {showEndChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[#2a2a2a] rounded-lg shadow-2xl border border-gray-700 p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-semibold text-white mb-2">End Chat</h3>
            <p className="text-gray-400 text-sm mb-6">
              Was your issue resolved?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleEndChatConfirm(true)}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-left"
              >
                <div className="font-medium">Yes, issue resolved</div>
                <div className="text-sm text-green-100 mt-1">End chat and start fresh</div>
              </button>
              
              <button
                onClick={() => handleEndChatConfirm(false)}
                className="w-full px-4 py-3 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] transition text-left"
              >
                <div className="font-medium">No, I need more help</div>
                <div className="text-sm text-orange-100 mt-1">Escalate to human support</div>
              </button>
            </div>
            
            <button
              onClick={() => setShowEndChatModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Guest Info Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[#2a2a2a] rounded-lg shadow-2xl border border-gray-700 p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-semibold text-white mb-2">Help Us Follow Up</h3>
            <p className="text-gray-400 text-sm mb-4">
              Please provide your email so we can follow up with you if needed.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FiMail className="inline w-4 h-4 mr-1" />
                  Email <span className="text-red-400 text-xs">*</span>
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35]"
                  autoFocus
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FiUser className="inline w-4 h-4 mr-1" />
                  Name <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35]"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSkipGuestInfo}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Skip
              </button>
              <button
                onClick={handleGuestInfoSubmit}
                disabled={!guestEmail.trim()}
                className="flex-1 px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-[#2a2a2a] rounded-lg shadow-2xl border border-gray-700 flex flex-col z-50">
          {/* Header */}
          <div className="bg-[#ff6b35] text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <div className="flex items-center space-x-2">
              {chatId && (
                <>
                  <button
                    onClick={handleEscalateToSupport}
                    className="hover:bg-white/20 rounded p-1 transition flex items-center space-x-1 text-sm"
                    aria-label="Escalate to support"
                    title="Get help from a human support agent"
                  >
                    <FiHeadphones className="w-4 h-4" />
                    <span className="text-xs">Get Help</span>
                  </button>
                  <button
                    onClick={handleEndChatClick}
                    className="hover:bg-white/20 rounded p-1 transition flex items-center space-x-1 text-sm"
                    aria-label="End chat"
                    title="End this chat"
                  >
                    <FiPower className="w-4 h-4" />
                    <span className="text-xs">End</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded p-1 transition"
                aria-label="Close chat"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-2`}
              >
                {/* Avatar for admin messages */}
                {message.sender === 'admin' && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {message.admin_user?.name 
                        ? message.admin_user.name.charAt(0).toUpperCase()
                        : 'A'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col max-w-[75%]">
                  {/* Admin name label */}
                  {message.sender === 'admin' && message.admin_user?.name && (
                    <span className="text-xs text-gray-400 mb-1 px-1">
                      {message.admin_user.name}
                    </span>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-[#ff6b35] text-white'
                        : message.sender === 'admin'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#1a1a1a] text-gray-100 border border-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === 'user' || message.sender === 'admin'
                          ? 'text-white/70'
                          : 'text-gray-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2">
                  <FiLoader className="w-5 h-5 text-[#ff6b35] animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35]"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-[#ff6b35] text-white rounded-lg px-4 py-2 hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Send message"
              >
                <FiSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

