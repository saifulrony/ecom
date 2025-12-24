'use client'

import { useState, useRef, useEffect } from 'react'
import { FiMessageCircle, FiX, FiSend, FiLoader } from 'react-icons/fi'
import api from '@/lib/api'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export default function ChatBox() {
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
          sender: msg.sender as 'user' | 'ai',
          timestamp: new Date(msg.created_at),
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

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-[#2a2a2a] rounded-lg shadow-2xl border border-gray-700 flex flex-col z-50">
          {/* Header */}
          <div className="bg-[#ff6b35] text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition"
              aria-label="Close chat"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-[#ff6b35] text-white'
                      : 'bg-[#1a1a1a] text-gray-100 border border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
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

