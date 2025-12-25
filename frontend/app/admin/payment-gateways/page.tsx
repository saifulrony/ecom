'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiCreditCard, FiSave, FiCheck, FiX, FiInfo, FiLock, FiGlobe } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface PaymentGatewayConfig {
  gateway: string
  is_active: boolean
  is_test_mode: boolean
  public_key?: string
  secret_key?: string
  merchant_id?: string
  store_id?: string
  store_password?: string
  client_id?: string
  client_secret?: string
  webhook_url?: string
}

export default function PaymentGatewaysPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [defaultGateway, setDefaultGateway] = useState('stripe')
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([])
  const [activeTab, setActiveTab] = useState<'stripe' | 'sslcommerz' | 'paypal'>('stripe')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }
    fetchGateways()
  }, [user, token, router])

  const fetchGateways = async () => {
    setLoading(true)
    try {
      const response = await adminAPI.getPaymentGateways()
      setGateways(response.data.gateways || [])
      setDefaultGateway(response.data.default_gateway || 'stripe')
    } catch (error) {
      console.error('Failed to fetch payment gateways:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGatewayConfig = (gatewayName: string): PaymentGatewayConfig => {
    return gateways.find(g => g.gateway === gatewayName) || {
      gateway: gatewayName,
      is_active: false,
      is_test_mode: true,
    }
  }

  const updateGatewayConfig = (gatewayName: string, updates: Partial<PaymentGatewayConfig>) => {
    setGateways(prev => {
      const existing = prev.find(g => g.gateway === gatewayName)
      if (existing) {
        return prev.map(g => g.gateway === gatewayName ? { ...g, ...updates } : g)
      } else {
        return [...prev, { gateway: gatewayName, is_active: false, is_test_mode: true, ...updates }]
      }
    })
  }

  const handleSave = async (gatewayName: string) => {
    setSaving(true)
    try {
      const config = getGatewayConfig(gatewayName)
      await adminAPI.updatePaymentGateway({
        gateway: gatewayName,
        is_active: config.is_active,
        is_test_mode: config.is_test_mode,
        public_key: config.public_key || '',
        secret_key: config.secret_key || '',
        merchant_id: config.merchant_id || '',
        store_id: config.store_id || '',
        store_password: config.store_password || '',
        client_id: config.client_id || '',
        client_secret: config.client_secret || '',
        webhook_url: config.webhook_url || '',
      })
      alert(`${gatewayName.charAt(0).toUpperCase() + gatewayName.slice(1)} configuration saved successfully!`)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async () => {
    setSaving(true)
    try {
      await adminAPI.setDefaultPaymentGateway(defaultGateway)
      alert(`Default payment gateway set to ${defaultGateway}`)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to set default gateway')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const stripeConfig = getGatewayConfig('stripe')
  const sslcommerzConfig = getGatewayConfig('sslcommerz')
  const paypalConfig = getGatewayConfig('paypal')

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FiCreditCard className="text-2xl text-[#ff6b35]" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
          </div>
        </div>

        {/* Default Gateway Selection */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Payment Gateway
          </label>
          <div className="flex items-center space-x-4">
            <select
              value={defaultGateway}
              onChange={(e) => setDefaultGateway(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            >
              <option value="stripe">Stripe</option>
              <option value="sslcommerz">SSLCommerz</option>
              <option value="paypal">PayPal</option>
            </select>
            <button
              onClick={handleSetDefault}
              disabled={saving}
              className="bg-[#ff6b35] text-white px-4 py-2 rounded-lg hover:bg-[#e55a2b] disabled:opacity-50 flex items-center space-x-2"
            >
              <FiSave className="w-4 h-4" />
              <span>Set Default</span>
            </button>
          </div>
        </div>

        {/* Gateway Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200">
          {['stripe', 'sslcommerz', 'paypal'].map((gateway) => (
            <button
              key={gateway}
              onClick={() => setActiveTab(gateway as any)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === gateway
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {gateway.charAt(0).toUpperCase() + gateway.slice(1)}
            </button>
          ))}
        </div>

        {/* Stripe Configuration */}
        {activeTab === 'stripe' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FiInfo className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Stripe Integration</p>
                  <p>Get your API keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard</a></p>
                  <p className="mt-1">Use test keys for testing and live keys for production.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="stripe_active"
                  checked={stripeConfig.is_active}
                  onChange={(e) => updateGatewayConfig('stripe', { is_active: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="stripe_active" className="text-sm font-medium text-gray-700">
                  Enable Stripe
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="stripe_test_mode"
                  checked={stripeConfig.is_test_mode}
                  onChange={(e) => updateGatewayConfig('stripe', { is_test_mode: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="stripe_test_mode" className="text-sm font-medium text-gray-700">
                  Test Mode
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publishable Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={stripeConfig.public_key || ''}
                onChange={(e) => updateGatewayConfig('stripe', { public_key: e.target.value })}
                placeholder="pk_test_..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={stripeConfig.secret_key || ''}
                  onChange={(e) => updateGatewayConfig('stripe', { secret_key: e.target.value })}
                  placeholder="sk_test_..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                />
                <FiLock className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL (Optional)
              </label>
              <input
                type="text"
                value={stripeConfig.webhook_url || ''}
                onChange={(e) => updateGatewayConfig('stripe', { webhook_url: e.target.value })}
                placeholder="https://yourdomain.com/api/webhooks/stripe"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => handleSave('stripe')}
              disabled={saving}
              className="bg-[#ff6b35] text-white px-6 py-2 rounded-lg hover:bg-[#e55a2b] disabled:opacity-50 flex items-center space-x-2"
            >
              <FiSave className="w-4 h-4" />
              <span>Save Stripe Configuration</span>
            </button>
          </div>
        )}

        {/* SSLCommerz Configuration */}
        {activeTab === 'sslcommerz' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FiInfo className="text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">SSLCommerz Integration</p>
                  <p>Get your credentials from <a href="https://developer.sslcommerz.com" target="_blank" rel="noopener noreferrer" className="underline">SSLCommerz Developer Portal</a></p>
                  <p className="mt-1">Use sandbox credentials for testing and live credentials for production.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sslcommerz_active"
                  checked={sslcommerzConfig.is_active}
                  onChange={(e) => updateGatewayConfig('sslcommerz', { is_active: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="sslcommerz_active" className="text-sm font-medium text-gray-700">
                  Enable SSLCommerz
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sslcommerz_test_mode"
                  checked={sslcommerzConfig.is_test_mode}
                  onChange={(e) => updateGatewayConfig('sslcommerz', { is_test_mode: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="sslcommerz_test_mode" className="text-sm font-medium text-gray-700">
                  Test Mode (Sandbox)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sslcommerzConfig.store_id || ''}
                onChange={(e) => updateGatewayConfig('sslcommerz', { store_id: e.target.value })}
                placeholder="yourstoreid"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={sslcommerzConfig.store_password || ''}
                  onChange={(e) => updateGatewayConfig('sslcommerz', { store_password: e.target.value })}
                  placeholder="Your store password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                />
                <FiLock className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Merchant ID (Optional)
              </label>
              <input
                type="text"
                value={sslcommerzConfig.merchant_id || ''}
                onChange={(e) => updateGatewayConfig('sslcommerz', { merchant_id: e.target.value })}
                placeholder="merchant_id"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL (Optional)
              </label>
              <input
                type="text"
                value={sslcommerzConfig.webhook_url || ''}
                onChange={(e) => updateGatewayConfig('sslcommerz', { webhook_url: e.target.value })}
                placeholder="https://yourdomain.com/api/webhooks/sslcommerz"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => handleSave('sslcommerz')}
              disabled={saving}
              className="bg-[#ff6b35] text-white px-6 py-2 rounded-lg hover:bg-[#e55a2b] disabled:opacity-50 flex items-center space-x-2"
            >
              <FiSave className="w-4 h-4" />
              <span>Save SSLCommerz Configuration</span>
            </button>
          </div>
        )}

        {/* PayPal Configuration */}
        {activeTab === 'paypal' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FiInfo className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">PayPal Integration</p>
                  <p>Get your credentials from <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="underline">PayPal Developer Dashboard</a></p>
                  <p className="mt-1">Use sandbox credentials for testing and live credentials for production.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="paypal_active"
                  checked={paypalConfig.is_active}
                  onChange={(e) => updateGatewayConfig('paypal', { is_active: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="paypal_active" className="text-sm font-medium text-gray-700">
                  Enable PayPal
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="paypal_test_mode"
                  checked={paypalConfig.is_test_mode}
                  onChange={(e) => updateGatewayConfig('paypal', { is_test_mode: e.target.checked })}
                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
                />
                <label htmlFor="paypal_test_mode" className="text-sm font-medium text-gray-700">
                  Test Mode (Sandbox)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={paypalConfig.client_id || ''}
                onChange={(e) => updateGatewayConfig('paypal', { client_id: e.target.value })}
                placeholder="Your PayPal Client ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={paypalConfig.client_secret || ''}
                  onChange={(e) => updateGatewayConfig('paypal', { client_secret: e.target.value })}
                  placeholder="Your PayPal Client Secret"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                />
                <FiLock className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL (Optional)
              </label>
              <input
                type="text"
                value={paypalConfig.webhook_url || ''}
                onChange={(e) => updateGatewayConfig('paypal', { webhook_url: e.target.value })}
                placeholder="https://yourdomain.com/api/webhooks/paypal"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => handleSave('paypal')}
              disabled={saving}
              className="bg-[#ff6b35] text-white px-6 py-2 rounded-lg hover:bg-[#e55a2b] disabled:opacity-50 flex items-center space-x-2"
            >
              <FiSave className="w-4 h-4" />
              <span>Save PayPal Configuration</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

