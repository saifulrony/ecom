'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiSettings } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

type StockType = 'website' | 'showroom'

export default function POSSettingsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [stockType, setStockType] = useState<StockType>('website')
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
        loadSettings()
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
            loadSettings()
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

        loadSettings()
      }, 100)

      return () => clearTimeout(timer)
    }

    checkAuth()
  }, [user, token, router])

  const loadSettings = () => {
    // Load stock type preference from localStorage
    const savedStockType = typeof window !== 'undefined' 
      ? localStorage.getItem('pos_stock_type') as StockType
      : null
    
    if (savedStockType && (savedStockType === 'website' || savedStockType === 'showroom')) {
      setStockType(savedStockType)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_stock_type', stockType)
        // Dispatch custom event to notify other tabs/pages
        window.dispatchEvent(new Event('storage'))
        // Also dispatch a custom event for same-window updates
        window.dispatchEvent(new CustomEvent('posStockTypeChanged', { detail: stockType }))
      }
      
      // TODO: In the future, save to backend API
      // await adminAPI.updatePOSSettings({ stock_type: stockType })
      
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POS Settings</h1>
            <p className="text-sm text-gray-600 mt-1">Configure your Point of Sale preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-[#ff6b35] rounded-lg flex items-center justify-center">
                <FiSettings className="text-gray-200 text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stock Configuration</h2>
                <p className="text-sm text-gray-600">Choose which stock inventory to use for POS</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:border-[#ff6b35] transition-colors cursor-pointer">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="stockType"
                    value="website"
                    checked={stockType === 'website'}
                    onChange={(e) => setStockType(e.target.value as StockType)}
                    className="mt-1 w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35] focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Website Stock</h3>
                      {stockType === 'website' && (
                        <span className="px-2 py-1 text-xs font-medium bg-[#ff6b35] text-gray-900 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Use the main website inventory stock. Orders placed through POS will reduce the website stock.
                    </p>
                  </div>
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-[#ff6b35] transition-colors cursor-pointer">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="stockType"
                    value="showroom"
                    checked={stockType === 'showroom'}
                    onChange={(e) => setStockType(e.target.value as StockType)}
                    className="mt-1 w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35] focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Showroom Stock (POS Stock)</h3>
                      {stockType === 'showroom' && (
                        <span className="px-2 py-1 text-xs font-medium bg-[#ff6b35] text-gray-900 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Use separate showroom/POS inventory stock. Orders placed through POS will only affect the showroom stock, not the website stock.
                    </p>
                  </div>
                </label>
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

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The stock type you select will determine which inventory is displayed and used when processing POS orders. 
              Make sure to keep your inventory synchronized between website and showroom if you're using separate stocks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

