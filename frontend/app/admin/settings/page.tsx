'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSettings, FiSave, FiBell, FiLock, FiUser, FiDollarSign, FiMail, FiCreditCard } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'EcomStore',
    siteEmail: 'admin@ecom.com',
    currency: 'BDT',
    taxRate: '0',
    shippingCost: '0',
    lowStockThreshold: '10',
    // Email settings
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: '',
    // SMS settings
    smsProvider: '',
    smsApiKey: '',
    smsApiSecret: '',
    // Payment settings
    paymentGateway: 'stripe',
    stripePublicKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalSecret: '',
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }
  }, [user, token, router])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await adminAPI.getSettings()
      const settingsData = response.data.settings || {}
      setSettings({
        siteName: settingsData.site_name || 'EcomStore',
        siteEmail: settingsData.site_email || 'admin@ecom.com',
        currency: settingsData.currency || 'BDT',
        taxRate: settingsData.tax_rate || '0',
        shippingCost: settingsData.shipping_cost || '0',
        lowStockThreshold: settingsData.low_stock_threshold || '10',
        smtpHost: settingsData.smtp_host || '',
        smtpPort: settingsData.smtp_port || '587',
        smtpUser: settingsData.smtp_user || '',
        smtpPassword: settingsData.smtp_password || '',
        smtpFromEmail: settingsData.smtp_from_email || '',
        smsProvider: settingsData.sms_provider || '',
        smsApiKey: settingsData.sms_api_key || '',
        smsApiSecret: settingsData.sms_api_secret || '',
        paymentGateway: settingsData.payment_gateway || 'stripe',
        stripePublicKey: settingsData.stripe_public_key || '',
        stripeSecretKey: settingsData.stripe_secret_key || '',
        paypalClientId: settingsData.paypal_client_id || '',
        paypalSecret: settingsData.paypal_secret || '',
      })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await adminAPI.updateSettings({
        site_name: settings.siteName,
        site_email: settings.siteEmail,
        currency: settings.currency,
        tax_rate: settings.taxRate,
        shipping_cost: settings.shippingCost,
        low_stock_threshold: settings.lowStockThreshold,
        smtp_host: settings.smtpHost,
        smtp_port: settings.smtpPort,
        smtp_user: settings.smtpUser,
        smtp_password: settings.smtpPassword,
        smtp_from_email: settings.smtpFromEmail,
        sms_provider: settings.smsProvider,
        sms_api_key: settings.smsApiKey,
        sms_api_secret: settings.smsApiSecret,
        payment_gateway: settings.paymentGateway,
        stripe_public_key: settings.stripePublicKey,
        stripe_secret_key: settings.stripeSecretKey,
        paypal_client_id: settings.paypalClientId,
        paypal_secret: settings.paypalSecret,
      })
      alert('Settings saved successfully!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FiSettings className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Email</label>
                <input
                  type="email"
                  value={settings.siteEmail}
                  onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                >
                  <option value="BDT">BDT (৳)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FiDollarSign className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Business Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Cost (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.shippingCost}
                  onChange={(e) => setSettings({ ...settings, shippingCost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
                <input
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FiMail className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Email Settings</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                  <input
                    type="text"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                    placeholder="587"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                <input
                  type="text"
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                <input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <input
                  type="email"
                  value={settings.smtpFromEmail}
                  onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
            </div>
          </div>

          {/* SMS Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FiBell className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">SMS Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMS Provider</label>
                <select
                  value={settings.smsProvider}
                  onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                >
                  <option value="">Select Provider</option>
                  <option value="twilio">Twilio</option>
                  <option value="nexmo">Nexmo</option>
                  <option value="aws-sns">AWS SNS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMS API Key</label>
                <input
                  type="text"
                  value={settings.smsApiKey}
                  onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMS API Secret</label>
                <input
                  type="password"
                  value={settings.smsApiSecret}
                  onChange={(e) => setSettings({ ...settings, smsApiSecret: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
            </div>
          </div>

          {/* Payment Gateway Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <FiCreditCard className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Payment Gateway Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Gateway</label>
                <select
                  value={settings.paymentGateway}
                  onChange={(e) => setSettings({ ...settings, paymentGateway: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                >
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="cash-on-delivery">Cash on Delivery</option>
                </select>
              </div>
              {settings.paymentGateway === 'stripe' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stripe Public Key</label>
                    <input
                      type="text"
                      value={settings.stripePublicKey}
                      onChange={(e) => setSettings({ ...settings, stripePublicKey: e.target.value })}
                      placeholder="pk_test_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stripe Secret Key</label>
                    <input
                      type="password"
                      value={settings.stripeSecretKey}
                      onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                      placeholder="sk_test_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                    />
                  </div>
                </>
              )}
              {settings.paymentGateway === 'paypal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PayPal Client ID</label>
                    <input
                      type="text"
                      value={settings.paypalClientId}
                      onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PayPal Secret</label>
                    <input
                      type="password"
                      value={settings.paypalSecret}
                      onChange={(e) => setSettings({ ...settings, paypalSecret: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                <FiUser className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                <FiLock className="w-4 h-4" />
                <span>Security</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center space-x-2">
                <FiBell className="w-4 h-4" />
                <span>Notifications</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2 bg-[#ff6b35] text-gray-900 px-6 py-2 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  )
}

