'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiSettings } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

export default function DashboardSettingsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      if (user && token) {
        const userRole = user.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }
        setLoading(false)
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
            setLoading(false)
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

        setLoading(false)
      }, 100)

      return () => clearTimeout(timer)
    }

    checkAuth()
  }, [user, token, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: Save dashboard settings to backend API
      // await adminAPI.updateDashboardSettings({ ... })
      
      alert('Settings saved successfully!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#ff6b35] rounded-lg flex items-center justify-center">
            <FiSettings className="text-gray-200 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Settings</h1>
            <p className="text-sm text-gray-600 mt-1">Configure your dashboard preferences</p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
        
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              Dashboard settings will be available here. You can configure display preferences, 
              default views, and other dashboard-related options.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-[#ff6b35] text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

