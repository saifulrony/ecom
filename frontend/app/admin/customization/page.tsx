'use client'

import { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import { FiSave, FiRefreshCw, FiDroplet, FiLayout, FiType, FiImage, FiSettings } from 'react-icons/fi'

type CustomizationKey = 'header' | 'footer' | 'body' | 'slider' | 'colors' | 'typography' | 'layout'

interface CustomizationSettings {
  [key: string]: any
}

export default function CustomizationPage() {
  const [activeTab, setActiveTab] = useState<CustomizationKey>('header')
  const [settings, setSettings] = useState<Record<string, CustomizationSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentSettings, setCurrentSettings] = useState<CustomizationSettings>({})

  useEffect(() => {
    fetchAllCustomizations()
  }, [])

  useEffect(() => {
    if (settings[activeTab]) {
      setCurrentSettings(settings[activeTab])
    } else {
      setCurrentSettings({})
    }
  }, [activeTab, settings])

  const fetchAllCustomizations = async () => {
    try {
      const response = await adminAPI.getAllCustomizations()
      setSettings(response.data.customizations || {})
    } catch (error) {
      console.error('Failed to fetch customizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminAPI.updateCustomization(activeTab, currentSettings)
      setSettings(prev => ({ ...prev, [activeTab]: currentSettings }))
      alert('Customization saved successfully!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save customization')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset this section to defaults?')) return
    
    try {
      await adminAPI.resetCustomization(activeTab)
      await fetchAllCustomizations()
      alert('Customization reset to defaults!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reset customization')
    }
  }

  const updateSetting = (key: string, value: any) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }))
  }

  const tabs = [
    { key: 'header' as CustomizationKey, label: 'Header', icon: FiLayout },
    { key: 'footer' as CustomizationKey, label: 'Footer', icon: FiLayout },
    { key: 'body' as CustomizationKey, label: 'Body', icon: FiSettings },
    { key: 'slider' as CustomizationKey, label: 'Slider', icon: FiImage },
    { key: 'colors' as CustomizationKey, label: 'Colors', icon: FiDroplet },
    { key: 'typography' as CustomizationKey, label: 'Typography', icon: FiType },
    { key: 'layout' as CustomizationKey, label: 'Layout', icon: FiSettings },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading customization settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Theme Customization</h1>
        <p className="text-gray-600">Customize every part of your website to match your brand</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-[#ff6b35] text-[#ff6b35]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header Customization */}
        {activeTab === 'header' && (
          <HeaderCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Footer Customization */}
        {activeTab === 'footer' && (
          <FooterCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Body Customization */}
        {activeTab === 'body' && (
          <BodyCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Slider Customization */}
        {activeTab === 'slider' && (
          <SliderCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Colors Customization */}
        {activeTab === 'colors' && (
          <ColorsCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Typography Customization */}
        {activeTab === 'typography' && (
          <TypographyCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Layout Customization */}
        {activeTab === 'layout' && (
          <LayoutCustomization settings={currentSettings} updateSetting={updateSetting} />
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center space-x-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FiSave className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Header Customization Component
function HeaderCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Header Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.background_color || '#1a1a1a'}
              onChange={(e) => updateSetting('background_color', e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={settings.background_color || '#1a1a1a'}
              onChange={(e) => updateSetting('background_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.text_color || '#ffffff'}
              onChange={(e) => updateSetting('text_color', e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={settings.text_color || '#ffffff'}
              onChange={(e) => updateSetting('text_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
          <input
            type="text"
            value={settings.height || '70px'}
            onChange={(e) => updateSetting('height', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            placeholder="70px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
          <select
            value={settings.logo_position || 'left'}
            onChange={(e) => updateSetting('logo_position', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.sticky !== false}
            onChange={(e) => updateSetting('sticky', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Sticky Header</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_search !== false}
            onChange={(e) => updateSetting('show_search', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Search Bar</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_cart !== false}
            onChange={(e) => updateSetting('show_cart', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Cart Icon</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_wishlist !== false}
            onChange={(e) => updateSetting('show_wishlist', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Wishlist Icon</span>
        </label>
      </div>
    </div>
  )
}

// Footer Customization Component
function FooterCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Footer Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.background_color || '#1a1a1a'}
              onChange={(e) => updateSetting('background_color', e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={settings.background_color || '#1a1a1a'}
              onChange={(e) => updateSetting('background_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.text_color || '#cccccc'}
              onChange={(e) => updateSetting('text_color', e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={settings.text_color || '#cccccc'}
              onChange={(e) => updateSetting('text_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Columns</label>
          <input
            type="number"
            min="1"
            max="6"
            value={settings.columns || 4}
            onChange={(e) => updateSetting('columns', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_copyright !== false}
            onChange={(e) => updateSetting('show_copyright', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Copyright</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_social_links !== false}
            onChange={(e) => updateSetting('show_social_links', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Social Links</span>
        </label>
      </div>
    </div>
  )
}

// Body Customization Component
function BodyCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Body Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.background_color || '#f5f5f5'}
              onChange={(e) => updateSetting('background_color', e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={settings.background_color || '#f5f5f5'}
              onChange={(e) => updateSetting('background_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.text_color || '#1a1a1a'}
              onChange={(e) => updateSetting('text_color', e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={settings.text_color || '#1a1a1a'}
              onChange={(e) => updateSetting('text_color', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Container Width</label>
          <input
            type="text"
            value={settings.container_width || '1200px'}
            onChange={(e) => updateSetting('container_width', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            placeholder="1200px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Padding</label>
          <input
            type="text"
            value={settings.padding || '20px'}
            onChange={(e) => updateSetting('padding', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            placeholder="20px"
          />
        </div>
      </div>
    </div>
  )
}

// Slider Customization Component
function SliderCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Slider Settings</h2>
      
      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.enabled !== false}
            onChange={(e) => updateSetting('enabled', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Enable Slider</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
            <input
              type="text"
              value={settings.height || '500px'}
              onChange={(e) => updateSetting('height', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Autoplay Speed (ms)</label>
            <input
              type="number"
              value={settings.autoplay_speed || 5000}
              onChange={(e) => updateSetting('autoplay_speed', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overlay Opacity (0-1)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={settings.overlay_opacity || 0.3}
              onChange={(e) => updateSetting('overlay_opacity', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoplay !== false}
              onChange={(e) => updateSetting('autoplay', e.target.checked)}
              className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
            />
            <span className="text-sm text-gray-700">Autoplay</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.show_arrows !== false}
              onChange={(e) => updateSetting('show_arrows', e.target.checked)}
              className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
            />
            <span className="text-sm text-gray-700">Show Navigation Arrows</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.show_dots !== false}
              onChange={(e) => updateSetting('show_dots', e.target.checked)}
              className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
            />
            <span className="text-sm text-gray-700">Show Dots Indicator</span>
          </label>
        </div>
      </div>
    </div>
  )
}

// Colors Customization Component
function ColorsCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  const colorFields = [
    { key: 'primary', label: 'Primary Color', default: '#ff6b35' },
    { key: 'secondary', label: 'Secondary Color', default: '#ff8c5a' },
    { key: 'success', label: 'Success Color', default: '#10b981' },
    { key: 'danger', label: 'Danger Color', default: '#ef4444' },
    { key: 'warning', label: 'Warning Color', default: '#f59e0b' },
    { key: 'info', label: 'Info Color', default: '#3b82f6' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Color Scheme</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {colorFields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings[field.key] || field.default}
                onChange={(e) => updateSetting(field.key, e.target.value)}
                className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings[field.key] || field.default}
                onChange={(e) => updateSetting(field.key, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Typography Customization Component
function TypographyCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  const fonts = [
    'Inter, sans-serif',
    'Roboto, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
    'Montserrat, sans-serif',
    'Poppins, sans-serif',
    'Playfair Display, serif',
    'Merriweather, serif',
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Typography Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Base Font Family</label>
          <select
            value={settings.font_family || 'Inter, sans-serif'}
            onChange={(e) => updateSetting('font_family', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Heading Font Family</label>
          <select
            value={settings.heading_font || 'Inter, sans-serif'}
            onChange={(e) => updateSetting('heading_font', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Base Font Size</label>
          <input
            type="text"
            value={settings.base_font_size || '16px'}
            onChange={(e) => updateSetting('base_font_size', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line Height</label>
          <input
            type="text"
            value={settings.line_height || '1.6'}
            onChange={(e) => updateSetting('line_height', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">H1 Size</label>
          <input
            type="text"
            value={settings.heading_size_h1 || '2.5rem'}
            onChange={(e) => updateSetting('heading_size_h1', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">H2 Size</label>
          <input
            type="text"
            value={settings.heading_size_h2 || '2rem'}
            onChange={(e) => updateSetting('heading_size_h2', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">H3 Size</label>
          <input
            type="text"
            value={settings.heading_size_h3 || '1.75rem'}
            onChange={(e) => updateSetting('heading_size_h3', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>
      </div>
    </div>
  )
}

// Layout Customization Component
function LayoutCustomization({ settings, updateSetting }: { settings: CustomizationSettings; updateSetting: (key: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Layout Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Grid Columns</label>
          <input
            type="number"
            min="1"
            max="6"
            value={settings.product_grid_columns || 4}
            onChange={(e) => updateSetting('product_grid_columns', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Card Style</label>
          <select
            value={settings.product_card_style || 'default'}
            onChange={(e) => updateSetting('product_card_style', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          >
            <option value="default">Default</option>
            <option value="minimal">Minimal</option>
            <option value="modern">Modern</option>
            <option value="classic">Classic</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Button Style</label>
          <select
            value={settings.button_style || 'rounded'}
            onChange={(e) => updateSetting('button_style', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          >
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
            <option value="pill">Pill</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
          <input
            type="text"
            value={settings.border_radius || '8px'}
            onChange={(e) => updateSetting('border_radius', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_product_rating !== false}
            onChange={(e) => updateSetting('show_product_rating', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Product Rating</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.show_product_wishlist !== false}
            onChange={(e) => updateSetting('show_product_wishlist', e.target.checked)}
            className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35]"
          />
          <span className="text-sm text-gray-700">Show Product Wishlist Button</span>
        </label>
      </div>
    </div>
  )
}

