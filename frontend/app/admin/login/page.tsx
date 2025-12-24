'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function AdminLogin() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('admin@ecom.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Auto-fill admin credentials
    setEmail('admin@ecom.com')
    setPassword('admin123')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login({ email, password })
      const { token, user } = response.data

      // If role is not in response, fetch it from profile endpoint
      let userRole = user?.role
      if (!userRole && token) {
        try {
          const profileResponse = await authAPI.getProfile()
          userRole = profileResponse.data.role
          if (userRole) {
            user.role = userRole
          }
        } catch (profileErr) {
          console.error('Failed to fetch profile:', profileErr)
        }
      }

      // Check if user has admin role (case-insensitive check)
      const normalizedRole = userRole?.toLowerCase()
      if (!normalizedRole || !['admin', 'staff', 'manager'].includes(normalizedRole)) {
        setError(`Access denied. Admin role required. Current role: ${userRole || 'none'}`)
        setLoading(false)
        return
      }

      // Ensure role is set in user object
      const userWithRole = { ...user, role: userRole }

      // Store token and user info using auth store
      setAuth(userWithRole, token)

      // Redirect to dashboard
      router.push('/admin/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.error || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-[#2a2a2a] rounded-lg shadow-xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-gray-400">Access the admin dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35]"
                placeholder="admin@ecom.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ff6b35]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff6b35] text-gray-900 py-3 rounded-lg font-semibold hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-[#ff6b35] hover:text-[#ff8c5a] text-sm"
            >
              Customer Login →
            </Link>
          </div>

          <div className="mt-6 p-4 bg-[#1a1a1a] rounded border border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Demo Credentials:</p>
            <p className="text-xs text-gray-300">Email: admin@ecom.com</p>
            <p className="text-xs text-gray-300">Password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

