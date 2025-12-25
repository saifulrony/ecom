'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Component } from './types'
import { FiTrash2, FiChevronDown, FiChevronUp, FiCode, FiType, FiDroplet, FiZap, FiUpload, FiX, FiImage, FiPlus } from 'react-icons/fi'
import Image from 'next/image'
import { adminAPI } from '@/lib/api'
import { gridTemplates } from './GridComponent'
import { columnTemplates } from './ColumnComponent'

interface PropertiesPanelProps {
  component: Component | null
  onUpdate: (component: Component) => void
  onDelete: (id: string) => void
}

type TabType = 'content' | 'style' | 'animation'

export default function PropertiesPanel({ component, onUpdate, onDelete }: PropertiesPanelProps) {
  const [localComponent, setLocalComponent] = useState<Component | null>(component)
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Use refs to store debounce timers (declare before useEffect that uses them)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const styleUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    spacing: false,
    positioning: false,
    display: false,
    dimensions: false,
    typography: false,
    colors: false,
    borders: false,
    effects: false,
    otherEffects: false,
    advanced: false,
  })

  useEffect(() => {
    if (component) {
      setLocalComponent(component)
      // Set image preview if component has an image src
      if (component.props?.src) {
        setImagePreview(component.props.src)
      } else {
        setImagePreview('')
      }
    } else {
      setLocalComponent(null)
      setImagePreview('')
    }
    
    // Cleanup timeouts on unmount or component change
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (styleUpdateTimeoutRef.current) {
        clearTimeout(styleUpdateTimeoutRef.current)
      }
    }
  }, [component])

  const getAPIUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:10000'
      }
      return `http://${hostname}:10000`
    }
    return 'http://localhost:10000'
  }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      const response = await adminAPI.uploadImage(formData)
      let url = response.data.url
      // If relative path, prepend backend base URL
      if (url.startsWith('/uploads/')) {
        url = `${getAPIUrl()}${url}`
      }
      return url
    } catch (error: any) {
      console.error('Failed to upload image:', error)
      alert(error.response?.data?.error || 'Failed to upload image')
      return null
    } finally {
      setUploading(false)
    }
  }

  if (!component || !localComponent) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full flex items-center justify-center">
        <div className="text-center text-gray-400 px-4">
          <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-sm font-medium">Select a component</p>
          <p className="text-xs mt-1">Click any component in the canvas to edit its properties</p>
        </div>
      </div>
    )
  }

  const updateProp = (key: string, value: any) => {
    if (!localComponent) return
    const updated = {
      ...localComponent,
      props: {
        ...(localComponent?.props || {}),
        [key]: value,
      },
    }
    setLocalComponent(updated)
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    // Debounce the parent update to avoid re-renders on every keystroke
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(updated)
    }, 300)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const url = await handleImageUpload(file)
    if (url) {
      updateProp('src', url)
      setImagePreview(url)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    updateProp('src', '')
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateStyle = (key: string, value: any) => {
    if (!localComponent) return
    const updated = {
      ...localComponent,
      style: {
        ...(localComponent?.style || {}),
        [key]: value || undefined,
      },
    }
    setLocalComponent(updated)
    
    // Clear existing timeout
    if (styleUpdateTimeoutRef.current) {
      clearTimeout(styleUpdateTimeoutRef.current)
    }
    
    // Debounce the parent update to avoid re-renders on every keystroke
    styleUpdateTimeoutRef.current = setTimeout(() => {
      onUpdate(updated)
    }, 300)
  }

  const updateContent = (value: string) => {
    if (!localComponent) return
    const updated = {
      ...localComponent,
      content: value,
    }
    setLocalComponent(updated)
    onUpdate(updated)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getStyleValue = (key: string) => {
    return localComponent?.style?.[key as keyof React.CSSProperties] || ''
  }

  // Reusable Input Components
  const InputField = ({ label, value, onChange, type = 'text', placeholder = '', min, max, step }: {
    label: string
    value: any
    onChange: (value: any) => void
    type?: string
    placeholder?: string
    min?: number
    max?: number
    step?: number
  }) => {
    // For number inputs, keep as string to allow values like "100px"
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'number') {
        // Only convert to number if it's a pure number, otherwise keep as string
        const inputValue = e.target.value
        if (inputValue === '' || inputValue === '-') {
          onChange(inputValue)
        } else {
          // Try to parse as number, but if it fails (e.g., "100px"), keep as string
          const numValue = parseFloat(inputValue)
          if (!isNaN(numValue) && inputValue === numValue.toString()) {
            onChange(numValue)
          } else {
            // Keep as string for values like "100px", "50%", etc.
            onChange(inputValue)
          }
        }
      } else {
        onChange(e.target.value)
      }
    }

    // Convert number value to string for display
    const displayValue = value != null ? String(value) : ''

    return (
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <input
          type={type === 'number' ? 'text' : type}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
        />
      </div>
    )
  }

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
          placeholder="#000000"
        />
      </div>
    </div>
  )

  const SelectField = ({ label, value, onChange, options }: {
    label: string
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
  }) => (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )

  const SectionHeader = ({ title, isExpanded, onToggle }: { title: string; isExpanded: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-sm sm:text-base font-semibold text-gray-900 hover:text-[#ff6b35] transition-colors"
    >
      <span>{title}</span>
      {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
    </button>
  )

  // Content Tab - Component-specific properties
  const renderContentTab = () => {
    if (!localComponent) return null
    
    switch (component.type) {
      case 'heading':
        return (
          <div className="space-y-3">
            <InputField
              label="Text"
              value={localComponent?.props?.text || localComponent?.content || ''}
              onChange={(val) => {
                updateProp('text', val)
                updateContent(val)
              }}
            />
            <SelectField
              label="Level"
              value={localComponent?.props?.level || 'h1'}
              onChange={(val) => updateProp('level', val)}
              options={[
                { value: 'h1', label: 'H1' },
                { value: 'h2', label: 'H2' },
                { value: 'h3', label: 'H3' },
                { value: 'h4', label: 'H4' },
                { value: 'h5', label: 'H5' },
                { value: 'h6', label: 'H6' },
              ]}
            />
            <SelectField
              label="Gradient (Text Gradient)"
              value={localComponent?.props?.gradient || 'none'}
              onChange={(val) => updateProp('gradient', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'gradient-primary', label: 'Primary Purple' },
                { value: 'gradient-warm', label: 'Warm Pink' },
                { value: 'gradient-cool', label: 'Cool Blue' },
                { value: 'gradient-orange', label: 'Orange' },
              ]}
            />
            <ColorPicker
              label="Text Color (if no gradient)"
              value={localComponent?.props?.color || '#000000'}
              onChange={(val) => updateProp('color', val)}
            />
            <InputField
              label="Font Size"
              value={localComponent?.props?.fontSize || '2.5rem'}
              onChange={(val) => updateProp('fontSize', val)}
              placeholder="2.5rem"
            />
            <SelectField
              label="Font Weight"
              value={localComponent?.props?.fontWeight || 'bold'}
              onChange={(val) => updateProp('fontWeight', val)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'medium', label: 'Medium' },
                { value: 'semibold', label: 'Semibold' },
                { value: 'bold', label: 'Bold' },
                { value: 'extrabold', label: 'Extra Bold' },
              ]}
            />
            <SelectField
              label="Text Align"
              value={localComponent?.props?.align || 'left'}
              onChange={(val) => updateProp('align', val)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
                { value: 'justify', label: 'Justify' },
              ]}
            />
          </div>
        )

      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Text</label>
              <textarea
                value={localComponent?.props?.text || localComponent?.content || ''}
                onChange={(e) => {
                  updateProp('text', e.target.value)
                  updateContent(e.target.value)
                }}
                rows={6}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>
            <ColorPicker
              label="Text Color"
              value={localComponent?.props?.color || '#333333'}
              onChange={(val) => updateProp('color', val)}
            />
            <InputField
              label="Font Size"
              value={localComponent?.props?.fontSize || '1rem'}
              onChange={(val) => updateProp('fontSize', val)}
              placeholder="1rem"
            />
            <InputField
              label="Line Height"
              value={localComponent?.props?.lineHeight || '1.6'}
              onChange={(val) => updateProp('lineHeight', val)}
              placeholder="1.6"
            />
            <SelectField
              label="Font Weight"
              value={localComponent?.props?.fontWeight || 'normal'}
              onChange={(val) => updateProp('fontWeight', val)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'medium', label: 'Medium' },
                { value: 'semibold', label: 'Semibold' },
                { value: 'bold', label: 'Bold' },
              ]}
            />
            <SelectField
              label="Text Align"
              value={localComponent?.props?.align || 'left'}
              onChange={(val) => updateProp('align', val)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
                { value: 'justify', label: 'Justify' },
              ]}
            />
          </div>
        )

      case 'button':
        return (
          <div className="space-y-3">
            <InputField
              label="Text"
              value={localComponent?.props?.text || localComponent?.content || ''}
              onChange={(val) => {
                updateProp('text', val)
                updateContent(val)
              }}
            />
            <InputField
              label="Link"
              value={localComponent?.props?.link || '#'}
              onChange={(val) => updateProp('link', val)}
              placeholder="/page-url"
            />
            <SelectField
              label="Variant"
              value={localComponent?.props?.variant || 'primary'}
              onChange={(val) => updateProp('variant', val)}
              options={[
                { value: 'primary', label: 'Primary' },
                { value: 'secondary', label: 'Secondary' },
                { value: 'outline', label: 'Outline' },
                { value: 'ghost', label: 'Ghost' },
              ]}
            />
            <SelectField
              label="Size"
              value={localComponent?.props?.size || 'md'}
              onChange={(val) => updateProp('size', val)}
              options={[
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
            />
            <SelectField
              label="Gradient Background"
              value={localComponent?.props?.gradient || 'none'}
              onChange={(val) => updateProp('gradient', val)}
              options={[
                { value: 'none', label: 'None (Solid Color)' },
                { value: 'gradient-primary', label: 'Primary Purple' },
                { value: 'gradient-warm', label: 'Warm Pink' },
                { value: 'gradient-cool', label: 'Cool Blue' },
                { value: 'gradient-orange', label: 'Orange' },
              ]}
            />
            <ColorPicker
              label="Background Color (if no gradient)"
              value={localComponent?.props?.bgColor || '#ff6b35'}
              onChange={(val) => updateProp('bgColor', val)}
            />
            <ColorPicker
              label="Text Color"
              value={localComponent?.props?.color || '#ffffff'}
              onChange={(val) => updateProp('color', val)}
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '8px'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="8px or 9999px for rounded"
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'md'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra Large' },
              ]}
            />
            <SelectField
              label="Hover Effect"
              value={localComponent?.props?.hoverEffect || 'none'}
              onChange={(val) => updateProp('hoverEffect', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'lift', label: 'Lift Up' },
                { value: 'glow', label: 'Glow' },
              ]}
            />
            <SelectField
              label="Text Align"
              value={localComponent?.props?.align || 'left'}
              onChange={(val) => updateProp('align', val)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </div>
        )

      case 'image':
        return (
          <div className="space-y-3">
            {/* Image Upload */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Image
              </label>
              {imagePreview || localComponent?.props?.src ? (
                <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-2 border border-gray-200">
                  <Image
                    src={imagePreview || localComponent?.props?.src || ''}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 320px"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                    aria-label="Remove image"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#ff6b35] transition">
                  <FiImage className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-xs text-gray-600 block mb-2">
                      Click to upload image
                    </span>
                    <span className="text-xs text-gray-500 block mb-2">
                      PNG, JPG, GIF up to 10MB
                    </span>
                    <div className="inline-flex items-center space-x-1.5 bg-[#ff6b35] text-white px-3 py-1.5 rounded-lg hover:bg-[#ff8c5a] transition text-xs">
                      <FiUpload className="w-3 h-3" />
                      <span>Choose File</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {uploading && (
                    <p className="text-xs text-gray-500 mt-2">Uploading...</p>
                  )}
                </div>
              )}
              {/* Allow URL input as fallback */}
              <div className="mt-2">
                <InputField
                  label="Or enter image URL"
                  value={localComponent?.props?.src || ''}
                  onChange={(val) => {
                    updateProp('src', val)
                    setImagePreview(val)
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <InputField
              label="Alt Text"
              value={localComponent?.props?.alt || ''}
              onChange={(val) => updateProp('alt', val)}
            />
            <InputField
              label="Width"
              value={localComponent?.props?.width || '100%'}
              onChange={(val) => updateProp('width', val)}
              placeholder="100% or 800px"
            />
            <InputField
              label="Height"
              value={localComponent?.props?.height || 'auto'}
              onChange={(val) => updateProp('height', val)}
              placeholder="auto or 600px"
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '0'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="0, 8px, 12px, etc."
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'none'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra Large' },
              ]}
            />
            <SelectField
              label="Hover Effect"
              value={localComponent?.props?.hoverEffect || 'none'}
              onChange={(val) => updateProp('hoverEffect', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'zoom', label: 'Zoom In' },
                { value: 'shadow', label: 'Enhanced Shadow' },
              ]}
            />
            <SelectField
              label="Align"
              value={localComponent?.props?.align || 'left'}
              onChange={(val) => updateProp('align', val)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </div>
        )

      case 'section':
        return (
          <div className="space-y-3">
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '40px'}
              onChange={(val) => updateProp('padding', val)}
              placeholder="40px or 20px 40px"
            />
            <SelectField
              label="Gradient Background"
              value={localComponent?.props?.gradient || 'none'}
              onChange={(val) => updateProp('gradient', val)}
              options={[
                { value: 'none', label: 'None (Solid Color)' },
                { value: 'gradient-primary', label: 'Primary Purple' },
                { value: 'gradient-warm', label: 'Warm Pink' },
                { value: 'gradient-cool', label: 'Cool Blue' },
                { value: 'gradient-orange', label: 'Orange' },
                { value: 'gradient-dark', label: 'Dark' },
              ]}
            />
            <ColorPicker
              label="Background Color (if no gradient)"
              value={localComponent?.props?.background || '#ffffff'}
              onChange={(val) => updateProp('background', val)}
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '0'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="0, 8px, 12px, etc."
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'none'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra Large' },
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.border || false}
                onChange={(e) => updateProp('border', e.target.checked)}
                className="h-4 w-4 text-[#ff6b35] focus:ring-[#ff6b35] border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Show Border</label>
            </div>
            {localComponent?.props?.border && (
              <ColorPicker
                label="Border Color"
                value={localComponent?.props?.borderColor || '#e5e7eb'}
                onChange={(val) => updateProp('borderColor', val)}
              />
            )}
            <SelectField
              label="Text Align"
              value={localComponent?.props?.align || 'center'}
              onChange={(val) => updateProp('align', val)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </div>
        )

      case 'card':
        return (
          <div className="space-y-3">
            <InputField
              label="Title"
              value={localComponent?.props?.title || ''}
              onChange={(val) => updateProp('title', val)}
              placeholder="Card Title"
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Content</label>
              <textarea
                value={localComponent?.props?.content || 'Card content'}
                onChange={(e) => updateProp('content', e.target.value)}
                rows={4}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
              />
            </div>
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '24px'}
              onChange={(val) => updateProp('padding', val)}
              placeholder="24px"
            />
            <SelectField
              label="Gradient Background"
              value={localComponent?.props?.gradient || 'none'}
              onChange={(val) => updateProp('gradient', val)}
              options={[
                { value: 'none', label: 'None (Solid Color)' },
                { value: 'gradient-primary', label: 'Primary Purple' },
                { value: 'gradient-warm', label: 'Warm Pink' },
                { value: 'gradient-cool', label: 'Cool Blue' },
                { value: 'gradient-orange', label: 'Orange' },
              ]}
            />
            <ColorPicker
              label="Background Color (if no gradient)"
              value={localComponent?.props?.background || '#ffffff'}
              onChange={(val) => updateProp('background', val)}
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '12px'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="12px"
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'md'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'xl', label: 'Extra Large' },
              ]}
            />
            <SelectField
              label="Hover Effect"
              value={localComponent?.props?.hoverEffect || 'none'}
              onChange={(val) => updateProp('hoverEffect', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'lift', label: 'Lift Up' },
                { value: 'glow', label: 'Glow' },
                { value: 'scale', label: 'Scale' },
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.border || false}
                onChange={(e) => updateProp('border', e.target.checked)}
                className="h-4 w-4 text-[#ff6b35] focus:ring-[#ff6b35] border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Show Border</label>
            </div>
            {localComponent?.props?.border && (
              <ColorPicker
                label="Border Color"
                value={localComponent?.props?.borderColor || '#e5e7eb'}
                onChange={(val) => updateProp('borderColor', val)}
              />
            )}
            <InputField
              label="Title Font Size"
              value={localComponent?.props?.titleSize || '1.25rem'}
              onChange={(val) => updateProp('titleSize', val)}
              placeholder="1.25rem"
            />
            <SelectField
              label="Title Font Weight"
              value={localComponent?.props?.titleWeight || 'bold'}
              onChange={(val) => updateProp('titleWeight', val)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'medium', label: 'Medium' },
                { value: 'semibold', label: 'Semibold' },
                { value: 'bold', label: 'Bold' },
              ]}
            />
            <ColorPicker
              label="Title Color"
              value={localComponent?.props?.titleColor || 'inherit'}
              onChange={(val) => updateProp('titleColor', val)}
            />
          </div>
        )

      case 'container':
        return (
          <div className="space-y-3">
            <InputField
              label="Columns"
              value={localComponent?.props?.columns || 2}
              onChange={(val) => updateProp('columns', val)}
              type="number"
              min={1}
              max={12}
            />
            <InputField
              label="Gap"
              value={localComponent?.props?.gap || '20px'}
              onChange={(val) => updateProp('gap', val)}
            />
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '20px'}
              onChange={(val) => updateProp('padding', val)}
            />
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.background || 'transparent'}
              onChange={(val) => updateProp('background', val)}
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '0'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="0"
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'none'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.border || false}
                onChange={(e) => updateProp('border', e.target.checked)}
                className="h-4 w-4 text-[#ff6b35] focus:ring-[#ff6b35] border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Show Border</label>
            </div>
            {localComponent?.props?.border && (
              <ColorPicker
                label="Border Color"
                value={localComponent?.props?.borderColor || '#e5e7eb'}
                onChange={(val) => updateProp('borderColor', val)}
              />
            )}
          </div>
        )

      case 'grid':
        return (
          <div className="space-y-3">
            <SelectField
              label="Grid Template"
              value={localComponent?.props?.template || 'custom'}
              onChange={(val) => {
                const template = gridTemplates[val as keyof typeof gridTemplates]
                if (template && val !== 'custom') {
                  updateProp('template', val)
                  updateProp('columns', template.columns)
                  updateProp('rows', template.rows)
                  
                  // Generate cells for the template (replace existing cells)
                  if (localComponent) {
                    const generateId = () => `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    const newCells: Component[] = []
                    for (let i = 0; i < template.cells; i++) {
                      const row = Math.floor(i / template.columns) + 1
                      const col = (i % template.columns) + 1
                      newCells.push({
                        id: generateId(),
                        type: 'text',
                        props: {
                          text: `Cell ${i + 1}`,
                          gridCell: {
                            columnStart: col,
                            rowStart: row,
                            columnSpan: 1,
                            rowSpan: 1,
                          },
                        },
                        content: `Cell ${i + 1}`,
                      })
                    }
                    const updated = {
                      ...localComponent,
                      children: newCells,
                      props: {
                        ...localComponent.props,
                        template: val,
                        columns: template.columns,
                        rows: template.rows,
                      },
                    }
                    setLocalComponent(updated)
                    onUpdate(updated)
                  }
                } else {
                  updateProp('template', 'custom')
                }
              }}
              options={[
                { value: '2x2', label: '2x2 Grid (4 cells)' },
                { value: '3x3', label: '3x3 Grid (9 cells)' },
                { value: '4x4', label: '4x4 Grid (16 cells)' },
                { value: '2x3', label: '2x3 Grid (6 cells)' },
                { value: '3x2', label: '3x2 Grid (6 cells)' },
                { value: '4x2', label: '4x2 Grid (8 cells)' },
                { value: '2x4', label: '2x4 Grid (8 cells)' },
                { value: 'custom', label: 'Custom Grid' },
              ]}
            />
            <InputField
              label="Columns"
              value={localComponent?.props?.columns || 3}
              onChange={(val) => updateProp('columns', val)}
              type="number"
              min={1}
              max={12}
            />
            <InputField
              label="Rows"
              value={localComponent?.props?.rows || Math.ceil((localComponent?.children?.length || 0) / (localComponent?.props?.columns || 3))}
              onChange={(val) => updateProp('rows', val)}
              type="number"
              min={1}
              max={12}
            />
            <InputField
              label="Gap"
              value={localComponent?.props?.gap || '20px'}
              onChange={(val) => updateProp('gap', val)}
              placeholder="20px"
            />
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '0'}
              onChange={(val) => updateProp('padding', val)}
              placeholder="0 or 20px"
            />
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.background || 'transparent'}
              onChange={(val) => updateProp('background', val)}
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '0'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="0"
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'none'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.border || false}
                onChange={(e) => updateProp('border', e.target.checked)}
                className="h-4 w-4 text-[#ff6b35] focus:ring-[#ff6b35] border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Show Border</label>
            </div>
            {localComponent?.props?.border && (
              <ColorPicker
                label="Border Color"
                value={localComponent?.props?.borderColor || '#e5e7eb'}
                onChange={(val) => updateProp('borderColor', val)}
              />
            )}
            {/* Grid Cells Management */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  Grid Cells ({localComponent?.children?.length || 0})
                </label>
                <button
                  onClick={() => {
                    if (localComponent) {
                      const generateId = () => `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                      const columns = localComponent.props?.columns || 3
                      const currentCells = localComponent.children || []
                      const newIndex = currentCells.length
                      const row = Math.floor(newIndex / columns) + 1
                      const col = (newIndex % columns) + 1
                      const newCell: Component = {
                        id: generateId(),
                        type: 'text',
                        props: {
                          text: `Cell ${newIndex + 1}`,
                          gridCell: {
                            columnStart: col,
                            rowStart: row,
                            columnSpan: 1,
                            rowSpan: 1,
                          },
                        },
                        content: `Cell ${newIndex + 1}`,
                      }
                      const updated = {
                        ...localComponent,
                        children: [...currentCells, newCell],
                      }
                      setLocalComponent(updated)
                      onUpdate(updated)
                    }
                  }}
                  className="text-xs px-2 py-1 bg-[#ff6b35] text-white rounded hover:bg-[#ff8c5a] transition"
                >
                  + Add Cell
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {localComponent?.children?.map((cell, index) => (
                  <div key={cell.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-700">
                      Cell {index + 1} - {cell.props?.gridCell?.columnSpan || 1}x{cell.props?.gridCell?.rowSpan || 1}
                    </span>
                    <button
                      onClick={() => {
                        if (localComponent && localComponent.children) {
                          const updated = {
                            ...localComponent,
                            children: localComponent.children.filter(c => c.id !== cell.id),
                          }
                          setLocalComponent(updated)
                          onUpdate(updated)
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Cell"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'column':
        return (
          <div className="space-y-3">
            <SelectField
              label="Column Layout Template"
              value={localComponent?.props?.template || 'custom'}
              onChange={(val) => {
                const template = columnTemplates[val as keyof typeof columnTemplates]
                if (template && val !== 'custom') {
                  updateProp('template', val)
                  updateProp('columns', template.columns)
                  updateProp('columnSizes', template.columnSizes)
                  
                  // Generate columns for the template (replace existing columns)
                  if (localComponent) {
                    const generateId = () => `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    const newColumns: Component[] = []
                    for (let i = 0; i < template.columns; i++) {
                      newColumns.push({
                        id: generateId(),
                        type: 'section',
                        props: {
                          padding: '20px',
                          background: '#ffffff',
                        },
                        children: [],
                      })
                    }
                    const updated = {
                      ...localComponent,
                      children: newColumns,
                      props: {
                        ...localComponent.props,
                        template: val,
                        columns: template.columns,
                        columnSizes: template.columnSizes,
                      },
                    }
                    setLocalComponent(updated)
                    onUpdate(updated)
                  }
                } else {
                  updateProp('template', 'custom')
                }
              }}
              options={[
                { value: '1-col', label: '1 Column (Full Width)' },
                { value: '2-col', label: '2 Columns (Equal)' },
                { value: '2-col-3-1', label: '2 Columns (3:1 Ratio)' },
                { value: '2-col-1-3', label: '2 Columns (1:3 Ratio)' },
                { value: '3-col', label: '3 Columns (Equal)' },
                { value: '3-col-2-1-1', label: '3 Columns (2:1:1)' },
                { value: '3-col-1-2-1', label: '3 Columns (1:2:1)' },
                { value: '3-col-1-1-2', label: '3 Columns (1:1:2)' },
                { value: '4-col', label: '4 Columns (Equal)' },
                { value: 'custom', label: 'Custom Layout' },
              ]}
            />
            <InputField
              label="Number of Columns"
              value={localComponent?.props?.columns || 2}
              onChange={(val) => {
                const numCols = parseInt(val) || 2
                const currentSizes = localComponent?.props?.columnSizes || Array(localComponent?.props?.columns || 2).fill('1fr')
                const newSizes = Array(numCols).fill('1fr').map((_, i) => currentSizes[i] || '1fr')
                updateProp('columns', numCols)
                updateProp('columnSizes', newSizes)
              }}
              type="number"
              min={1}
              max={6}
            />
            <InputField
              label="Gap Between Columns"
              value={localComponent?.props?.gap || '20px'}
              onChange={(val) => updateProp('gap', val)}
              placeholder="20px"
            />
            <SelectField
              label="Column Alignment"
              value={localComponent?.props?.align || 'stretch'}
              onChange={(val) => updateProp('align', val)}
              options={[
                { value: 'stretch', label: 'Stretch (Default)' },
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.responsive !== false}
                onChange={(e) => updateProp('responsive', e.target.checked)}
                className="h-4 w-4 text-[#ff6b35] focus:ring-[#ff6b35] border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Responsive (Stack on Mobile)</label>
            </div>
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '0'}
              onChange={(val) => updateProp('padding', val)}
              placeholder="0 or 20px"
            />
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.background || 'transparent'}
              onChange={(val) => updateProp('background', val)}
            />
            <InputField
              label="Border Radius"
              value={localComponent?.props?.radius || '0'}
              onChange={(val) => updateProp('radius', val)}
              placeholder="0"
            />
            <SelectField
              label="Shadow"
              value={localComponent?.props?.shadow || 'none'}
              onChange={(val) => updateProp('shadow', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.border || false}
                onChange={(e) => updateProp('border', e.target.checked)}
                className="h-4 w-4 text-[#ff6b35] focus:ring-[#ff6b35] border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Show Border</label>
            </div>
            {localComponent?.props?.border && (
              <ColorPicker
                label="Border Color"
                value={localComponent?.props?.borderColor || '#e5e7eb'}
                onChange={(val) => updateProp('borderColor', val)}
              />
            )}
            
            {/* Column Sizes (for custom layout) */}
            <div className="pt-3 border-t border-gray-200">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Column Widths (Advanced)
              </label>
              <div className="space-y-2">
                {(localComponent?.props?.columnSizes || Array(localComponent?.props?.columns || 2).fill('1fr')).map((size: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600 w-16">Col {index + 1}:</label>
                    <InputField
                      label=""
                      value={size}
                      onChange={(val) => {
                        const currentSizes = localComponent?.props?.columnSizes || Array(localComponent?.props?.columns || 2).fill('1fr')
                        const newSizes = [...currentSizes]
                        newSizes[index] = val
                        updateProp('columnSizes', newSizes)
                      }}
                      placeholder="1fr or 2fr or 300px"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use fr units for flexible columns (e.g., 1fr, 2fr) or px for fixed width
              </p>
            </div>
            
            {/* Column Management */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  Columns ({localComponent?.children?.length || 0})
                </label>
                <button
                  onClick={() => {
                    if (localComponent) {
                      const generateId = () => `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                      const currentColumns = localComponent.children || []
                      const newColumn: Component = {
                        id: generateId(),
                        type: 'section',
                        props: {
                          padding: '20px',
                          background: '#ffffff',
                        },
                        children: [],
                      }
                      const newNumColumns = currentColumns.length + 1
                      const currentSizes = localComponent.props?.columnSizes || Array(currentColumns.length).fill('1fr')
                      const newColumnSizes = [...currentSizes, '1fr']
                      const updated = {
                        ...localComponent,
                        children: [...currentColumns, newColumn],
                        props: {
                          ...localComponent.props,
                          columns: newNumColumns,
                          columnSizes: newColumnSizes,
                        },
                      }
                      setLocalComponent(updated)
                      onUpdate(updated)
                    }
                  }}
                  className="text-xs px-2 py-1 bg-[#ff6b35] text-white rounded hover:bg-[#ff8c5a] transition flex items-center space-x-1"
                >
                  <FiPlus className="w-3 h-3" />
                  <span>Add Column</span>
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {localComponent?.children?.map((col, index) => (
                  <div key={col.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-700">
                      Column {index + 1} - {localComponent?.props?.columnSizes?.[index] || '1fr'}
                    </span>
                    <button
                      onClick={() => {
                        if (localComponent && localComponent.children) {
                          const updatedChildren = localComponent.children.filter(c => c.id !== col.id)
                          const newNumColumns = updatedChildren.length
                          const currentSizes = localComponent.props?.columnSizes || Array(localComponent.children.length).fill('1fr')
                          const newColumnSizes = currentSizes.filter((_, i) => i !== index)
                          const updated = {
                            ...localComponent,
                            children: updatedChildren,
                            props: {
                              ...localComponent.props,
                              columns: newNumColumns,
                              columnSizes: newColumnSizes.length > 0 ? newColumnSizes : Array(newNumColumns).fill('1fr'),
                            },
                          }
                          setLocalComponent(updated)
                          onUpdate(updated)
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Column"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'products-grid':
      case 'featured-products':
        return (
          <div className="space-y-3">
            <InputField
              label="Number of Products"
              value={localComponent?.props?.limit || 12}
              onChange={(val) => updateProp('limit', val)}
              type="number"
              min={1}
              max={50}
            />
            <InputField
              label="Columns"
              value={localComponent?.props?.columns || 4}
              onChange={(val) => updateProp('columns', val)}
              type="number"
              min={1}
              max={6}
            />
          </div>
        )

      case 'banner':
        return (
          <div className="space-y-3">
            <InputField
              label="Title"
              value={localComponent?.props?.title || 'Banner Title'}
              onChange={(val) => updateProp('title', val)}
            />
            <InputField
              label="Subtitle"
              value={localComponent?.props?.subtitle || 'Banner subtitle'}
              onChange={(val) => updateProp('subtitle', val)}
            />
            <InputField
              label="Image URL"
              value={localComponent?.props?.image || ''}
              onChange={(val) => updateProp('image', val)}
              placeholder="https://example.com/image.jpg"
            />
            <SelectField
              label="Gradient Background (if no image)"
              value={localComponent?.props?.gradient || 'none'}
              onChange={(val) => updateProp('gradient', val)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'gradient-primary', label: 'Primary Purple' },
                { value: 'gradient-warm', label: 'Warm Pink' },
                { value: 'gradient-cool', label: 'Cool Blue' },
                { value: 'gradient-orange', label: 'Orange' },
              ]}
            />
            <InputField
              label="Height"
              value={localComponent?.props?.height || '400px'}
              onChange={(val) => updateProp('height', val)}
              placeholder="400px"
            />
          </div>
        )

      default:
        return (
          <div className="text-center text-gray-500 py-8 text-sm">
            <p>No content properties for this component type.</p>
          </div>
        )
    }
  }

  // Style Tab - Combines Layout, Typography, Colors, and Borders
  const renderStyleTab = () => (
    <div className="space-y-4">
      {/* Spacing */}
      <div>
        <SectionHeader
          title="Spacing"
          isExpanded={expandedSections.spacing}
          onToggle={() => toggleSection('spacing')}
        />
        {expandedSections.spacing && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Margin Top" value={getStyleValue('marginTop')} onChange={(v) => updateStyle('marginTop', v)} />
              <InputField label="Margin Right" value={getStyleValue('marginRight')} onChange={(v) => updateStyle('marginRight', v)} />
              <InputField label="Margin Bottom" value={getStyleValue('marginBottom')} onChange={(v) => updateStyle('marginBottom', v)} />
              <InputField label="Margin Left" value={getStyleValue('marginLeft')} onChange={(v) => updateStyle('marginLeft', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Padding Top" value={getStyleValue('paddingTop')} onChange={(v) => updateStyle('paddingTop', v)} />
              <InputField label="Padding Right" value={getStyleValue('paddingRight')} onChange={(v) => updateStyle('paddingRight', v)} />
              <InputField label="Padding Bottom" value={getStyleValue('paddingBottom')} onChange={(v) => updateStyle('paddingBottom', v)} />
              <InputField label="Padding Left" value={getStyleValue('paddingLeft')} onChange={(v) => updateStyle('paddingLeft', v)} />
            </div>
            <InputField label="Margin (shorthand)" value={getStyleValue('margin')} onChange={(v) => updateStyle('margin', v)} placeholder="10px 20px" />
            <InputField label="Padding (shorthand)" value={getStyleValue('padding')} onChange={(v) => updateStyle('padding', v)} placeholder="10px 20px" />
          </div>
        )}
      </div>

      {/* Positioning */}
      <div>
        <SectionHeader
          title="Positioning"
          isExpanded={expandedSections.positioning}
          onToggle={() => toggleSection('positioning')}
        />
        {expandedSections.positioning && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Position"
              value={getStyleValue('position') as string || 'static'}
              onChange={(v) => updateStyle('position', v)}
              options={[
                { value: 'static', label: 'Static' },
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'sticky', label: 'Sticky' },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Top" value={getStyleValue('top')} onChange={(v) => updateStyle('top', v)} />
              <InputField label="Right" value={getStyleValue('right')} onChange={(v) => updateStyle('right', v)} />
              <InputField label="Bottom" value={getStyleValue('bottom')} onChange={(v) => updateStyle('bottom', v)} />
              <InputField label="Left" value={getStyleValue('left')} onChange={(v) => updateStyle('left', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Z-Index" value={getStyleValue('zIndex')} onChange={(v) => updateStyle('zIndex', v)} type="number" />
              <SelectField
                label="Float"
                value={getStyleValue('float') as string || 'none'}
                onChange={(v) => updateStyle('float', v)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Display & Flexbox */}
      <div>
        <SectionHeader
          title="Display & Flexbox"
          isExpanded={expandedSections.display}
          onToggle={() => toggleSection('display')}
        />
        {expandedSections.display && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Display"
              value={getStyleValue('display') as string || 'block'}
              onChange={(v) => updateStyle('display', v)}
              options={[
                { value: 'block', label: 'Block' },
                { value: 'inline', label: 'Inline' },
                { value: 'inline-block', label: 'Inline Block' },
                { value: 'flex', label: 'Flex' },
                { value: 'inline-flex', label: 'Inline Flex' },
                { value: 'grid', label: 'Grid' },
                { value: 'none', label: 'None' },
              ]}
            />
            {(getStyleValue('display') === 'flex' || getStyleValue('display') === 'inline-flex') && (
              <>
                <SelectField
                  label="Flex Direction"
                  value={getStyleValue('flexDirection') as string || 'row'}
                  onChange={(v) => updateStyle('flexDirection', v)}
                  options={[
                    { value: 'row', label: 'Row' },
                    { value: 'column', label: 'Column' },
                    { value: 'row-reverse', label: 'Row Reverse' },
                    { value: 'column-reverse', label: 'Column Reverse' },
                  ]}
                />
                <SelectField
                  label="Justify Content"
                  value={getStyleValue('justifyContent') as string || 'flex-start'}
                  onChange={(v) => updateStyle('justifyContent', v)}
                  options={[
                    { value: 'flex-start', label: 'Flex Start' },
                    { value: 'flex-end', label: 'Flex End' },
                    { value: 'center', label: 'Center' },
                    { value: 'space-between', label: 'Space Between' },
                    { value: 'space-around', label: 'Space Around' },
                    { value: 'space-evenly', label: 'Space Evenly' },
                  ]}
                />
                <SelectField
                  label="Align Items"
                  value={getStyleValue('alignItems') as string || 'stretch'}
                  onChange={(v) => updateStyle('alignItems', v)}
                  options={[
                    { value: 'stretch', label: 'Stretch' },
                    { value: 'flex-start', label: 'Flex Start' },
                    { value: 'flex-end', label: 'Flex End' },
                    { value: 'center', label: 'Center' },
                    { value: 'baseline', label: 'Baseline' },
                  ]}
                />
                <InputField label="Gap" value={getStyleValue('gap')} onChange={(v) => updateStyle('gap', v)} />
                <InputField label="Flex Wrap" value={getStyleValue('flexWrap')} onChange={(v) => updateStyle('flexWrap', v)} placeholder="nowrap, wrap, wrap-reverse" />
              </>
            )}
            {(getStyleValue('display') === 'grid') && (
              <>
                <InputField label="Grid Template Columns" value={getStyleValue('gridTemplateColumns')} onChange={(v) => updateStyle('gridTemplateColumns', v)} placeholder="repeat(3, 1fr)" />
                <InputField label="Grid Template Rows" value={getStyleValue('gridTemplateRows')} onChange={(v) => updateStyle('gridTemplateRows', v)} />
                <InputField label="Grid Gap" value={getStyleValue('gap')} onChange={(v) => updateStyle('gap', v)} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Dimensions */}
      <div>
        <SectionHeader
          title="Dimensions"
          isExpanded={expandedSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
        />
        {expandedSections.dimensions && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Width" value={getStyleValue('width')} onChange={(v) => updateStyle('width', v)} />
              <InputField label="Height" value={getStyleValue('height')} onChange={(v) => updateStyle('height', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Min Width" value={getStyleValue('minWidth')} onChange={(v) => updateStyle('minWidth', v)} />
              <InputField label="Min Height" value={getStyleValue('minHeight')} onChange={(v) => updateStyle('minHeight', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Max Width" value={getStyleValue('maxWidth')} onChange={(v) => updateStyle('maxWidth', v)} />
              <InputField label="Max Height" value={getStyleValue('maxHeight')} onChange={(v) => updateStyle('maxHeight', v)} />
            </div>
            <SelectField
              label="Box Sizing"
              value={getStyleValue('boxSizing') as string || 'content-box'}
              onChange={(v) => updateStyle('boxSizing', v)}
              options={[
                { value: 'content-box', label: 'Content Box' },
                { value: 'border-box', label: 'Border Box' },
              ]}
            />
          </div>
        )}
      </div>

      {/* Typography */}
      <div>
        <SectionHeader
          title="Typography"
          isExpanded={expandedSections.typography}
          onToggle={() => toggleSection('typography')}
        />
        {expandedSections.typography && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <InputField
              label="Font Family"
              value={getStyleValue('fontFamily')}
              onChange={(v) => updateStyle('fontFamily', v)}
              placeholder="Arial, sans-serif"
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Font Size"
                value={localComponent?.props?.fontSize || getStyleValue('fontSize')}
                onChange={(v) => {
                  updateProp('fontSize', v)
                  updateStyle('fontSize', v)
                }}
                placeholder="16px, 1rem, 1.2em"
              />
              <InputField
                label="Font Weight"
                value={getStyleValue('fontWeight')}
                onChange={(v) => updateStyle('fontWeight', v)}
                placeholder="400, bold, 700"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Line Height"
                value={getStyleValue('lineHeight')}
                onChange={(v) => updateStyle('lineHeight', v)}
                placeholder="1.5, 24px"
              />
              <InputField
                label="Letter Spacing"
                value={getStyleValue('letterSpacing')}
                onChange={(v) => updateStyle('letterSpacing', v)}
                placeholder="0.5px, 0.1em"
              />
            </div>
            <SelectField
              label="Text Align"
              value={localComponent?.props?.align || (getStyleValue('textAlign') as string) || 'left'}
              onChange={(v) => {
                updateProp('align', v)
                updateStyle('textAlign', v)
              }}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
                { value: 'justify', label: 'Justify' },
              ]}
            />
            <SelectField
              label="Text Transform"
              value={getStyleValue('textTransform') as string || 'none'}
              onChange={(v) => updateStyle('textTransform', v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'uppercase', label: 'Uppercase' },
                { value: 'lowercase', label: 'Lowercase' },
                { value: 'capitalize', label: 'Capitalize' },
              ]}
            />
            <SelectField
              label="Text Decoration"
              value={getStyleValue('textDecoration') as string || 'none'}
              onChange={(v) => updateStyle('textDecoration', v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'underline', label: 'Underline' },
                { value: 'overline', label: 'Overline' },
                { value: 'line-through', label: 'Line Through' },
              ]}
            />
            <InputField label="Word Spacing" value={getStyleValue('wordSpacing')} onChange={(v) => updateStyle('wordSpacing', v)} />
          </div>
        )}
      </div>

      {/* Colors */}
      <div>
        <SectionHeader
          title="Colors & Background"
          isExpanded={expandedSections.colors}
          onToggle={() => toggleSection('colors')}
        />
        {expandedSections.colors && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <ColorPicker
              label="Text Color"
              value={localComponent?.props?.color || (getStyleValue('color') as string) || '#000000'}
              onChange={(v) => {
                updateProp('color', v)
                updateStyle('color', v)
              }}
            />
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.background || (getStyleValue('backgroundColor') as string) || '#ffffff'}
              onChange={(v) => {
                updateProp('background', v)
                updateStyle('backgroundColor', v)
              }}
            />
            <InputField
              label="Background Image"
              value={getStyleValue('backgroundImage')}
              onChange={(v) => updateStyle('backgroundImage', v)}
              placeholder="url('image.jpg')"
            />
            <SelectField
              label="Background Size"
              value={getStyleValue('backgroundSize') as string || 'auto'}
              onChange={(v) => updateStyle('backgroundSize', v)}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'cover', label: 'Cover' },
                { value: 'contain', label: 'Contain' },
                { value: '100% 100%', label: '100% 100%' },
              ]}
            />
            <SelectField
              label="Background Position"
              value={getStyleValue('backgroundPosition') as string || 'center'}
              onChange={(v) => updateStyle('backgroundPosition', v)}
              options={[
                { value: 'center', label: 'Center' },
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
                { value: 'top left', label: 'Top Left' },
                { value: 'top right', label: 'Top Right' },
                { value: 'bottom left', label: 'Bottom Left' },
                { value: 'bottom right', label: 'Bottom Right' },
              ]}
            />
            <SelectField
              label="Background Repeat"
              value={getStyleValue('backgroundRepeat') as string || 'no-repeat'}
              onChange={(v) => updateStyle('backgroundRepeat', v)}
              options={[
                { value: 'no-repeat', label: 'No Repeat' },
                { value: 'repeat', label: 'Repeat' },
                { value: 'repeat-x', label: 'Repeat X' },
                { value: 'repeat-y', label: 'Repeat Y' },
              ]}
            />
            <InputField
              label="Opacity (0-1)"
              value={getStyleValue('opacity')}
              onChange={(v) => updateStyle('opacity', v)}
              type="number"
              min={0}
              max={1}
              step={0.1}
              placeholder="1"
            />
          </div>
        )}
      </div>

      {/* Borders */}
      <div>
        <SectionHeader
          title="Borders & Shadows"
          isExpanded={expandedSections.borders}
          onToggle={() => toggleSection('borders')}
        />
        {expandedSections.borders && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Border Width" value={getStyleValue('borderWidth')} onChange={(v) => updateStyle('borderWidth', v)} placeholder="1px" />
              <SelectField
                label="Border Style"
                value={getStyleValue('borderStyle') as string || 'solid'}
                onChange={(v) => updateStyle('borderStyle', v)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'solid', label: 'Solid' },
                  { value: 'dashed', label: 'Dashed' },
                  { value: 'dotted', label: 'Dotted' },
                  { value: 'double', label: 'Double' },
                ]}
              />
            </div>
            <ColorPicker
              label="Border Color"
              value={(getStyleValue('borderColor') as string) || '#000000'}
              onChange={(v) => updateStyle('borderColor', v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Border Radius" value={getStyleValue('borderRadius')} onChange={(v) => updateStyle('borderRadius', v)} placeholder="4px" />
              <InputField label="Border Radius (Top Left)" value={getStyleValue('borderTopLeftRadius')} onChange={(v) => updateStyle('borderTopLeftRadius', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Border Radius (Top Right)" value={getStyleValue('borderTopRightRadius')} onChange={(v) => updateStyle('borderTopRightRadius', v)} />
              <InputField label="Border Radius (Bottom Left)" value={getStyleValue('borderBottomLeftRadius')} onChange={(v) => updateStyle('borderBottomLeftRadius', v)} />
            </div>
            <InputField label="Border Radius (Bottom Right)" value={getStyleValue('borderBottomRightRadius')} onChange={(v) => updateStyle('borderBottomRightRadius', v)} />
            <InputField
              label="Box Shadow"
              value={getStyleValue('boxShadow')}
              onChange={(v) => updateStyle('boxShadow', v)}
              placeholder="0 2px 4px rgba(0,0,0,0.1)"
            />
            <InputField
              label="Text Shadow"
              value={getStyleValue('textShadow')}
              onChange={(v) => updateStyle('textShadow', v)}
              placeholder="1px 1px 2px rgba(0,0,0,0.1)"
            />
          </div>
        )}
      </div>
    </div>
  )

  // Layout Tab (keep for backward compatibility but merge into Style)
  const renderLayoutTab = () => (
    <div className="space-y-4">
      {/* Spacing */}
      <div>
        <SectionHeader
          title="Spacing"
          isExpanded={expandedSections.spacing}
          onToggle={() => toggleSection('spacing')}
        />
        {expandedSections.spacing && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Margin Top" value={getStyleValue('marginTop')} onChange={(v) => updateStyle('marginTop', v)} />
              <InputField label="Margin Right" value={getStyleValue('marginRight')} onChange={(v) => updateStyle('marginRight', v)} />
              <InputField label="Margin Bottom" value={getStyleValue('marginBottom')} onChange={(v) => updateStyle('marginBottom', v)} />
              <InputField label="Margin Left" value={getStyleValue('marginLeft')} onChange={(v) => updateStyle('marginLeft', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Padding Top" value={getStyleValue('paddingTop')} onChange={(v) => updateStyle('paddingTop', v)} />
              <InputField label="Padding Right" value={getStyleValue('paddingRight')} onChange={(v) => updateStyle('paddingRight', v)} />
              <InputField label="Padding Bottom" value={getStyleValue('paddingBottom')} onChange={(v) => updateStyle('paddingBottom', v)} />
              <InputField label="Padding Left" value={getStyleValue('paddingLeft')} onChange={(v) => updateStyle('paddingLeft', v)} />
            </div>
            <InputField label="Margin (shorthand)" value={getStyleValue('margin')} onChange={(v) => updateStyle('margin', v)} placeholder="10px 20px" />
            <InputField label="Padding (shorthand)" value={getStyleValue('padding')} onChange={(v) => updateStyle('padding', v)} placeholder="10px 20px" />
          </div>
        )}
      </div>

      {/* Positioning */}
      <div>
        <SectionHeader
          title="Positioning"
          isExpanded={expandedSections.positioning}
          onToggle={() => toggleSection('positioning')}
        />
        {expandedSections.positioning && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Position"
              value={getStyleValue('position') as string || 'static'}
              onChange={(v) => updateStyle('position', v)}
              options={[
                { value: 'static', label: 'Static' },
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'sticky', label: 'Sticky' },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Top" value={getStyleValue('top')} onChange={(v) => updateStyle('top', v)} />
              <InputField label="Right" value={getStyleValue('right')} onChange={(v) => updateStyle('right', v)} />
              <InputField label="Bottom" value={getStyleValue('bottom')} onChange={(v) => updateStyle('bottom', v)} />
              <InputField label="Left" value={getStyleValue('left')} onChange={(v) => updateStyle('left', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Z-Index" value={getStyleValue('zIndex')} onChange={(v) => updateStyle('zIndex', v)} type="number" />
              <SelectField
                label="Float"
                value={getStyleValue('float') as string || 'none'}
                onChange={(v) => updateStyle('float', v)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Display & Flexbox */}
      <div>
        <SectionHeader
          title="Display & Flexbox"
          isExpanded={expandedSections.display}
          onToggle={() => toggleSection('display')}
        />
        {expandedSections.display && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Display"
              value={getStyleValue('display') as string || 'block'}
              onChange={(v) => updateStyle('display', v)}
              options={[
                { value: 'block', label: 'Block' },
                { value: 'inline', label: 'Inline' },
                { value: 'inline-block', label: 'Inline Block' },
                { value: 'flex', label: 'Flex' },
                { value: 'inline-flex', label: 'Inline Flex' },
                { value: 'grid', label: 'Grid' },
                { value: 'none', label: 'None' },
              ]}
            />
            {(getStyleValue('display') === 'flex' || getStyleValue('display') === 'inline-flex') && (
              <>
                <SelectField
                  label="Flex Direction"
                  value={getStyleValue('flexDirection') as string || 'row'}
                  onChange={(v) => updateStyle('flexDirection', v)}
                  options={[
                    { value: 'row', label: 'Row' },
                    { value: 'column', label: 'Column' },
                    { value: 'row-reverse', label: 'Row Reverse' },
                    { value: 'column-reverse', label: 'Column Reverse' },
                  ]}
                />
                <SelectField
                  label="Justify Content"
                  value={getStyleValue('justifyContent') as string || 'flex-start'}
                  onChange={(v) => updateStyle('justifyContent', v)}
                  options={[
                    { value: 'flex-start', label: 'Flex Start' },
                    { value: 'flex-end', label: 'Flex End' },
                    { value: 'center', label: 'Center' },
                    { value: 'space-between', label: 'Space Between' },
                    { value: 'space-around', label: 'Space Around' },
                    { value: 'space-evenly', label: 'Space Evenly' },
                  ]}
                />
                <SelectField
                  label="Align Items"
                  value={getStyleValue('alignItems') as string || 'stretch'}
                  onChange={(v) => updateStyle('alignItems', v)}
                  options={[
                    { value: 'stretch', label: 'Stretch' },
                    { value: 'flex-start', label: 'Flex Start' },
                    { value: 'flex-end', label: 'Flex End' },
                    { value: 'center', label: 'Center' },
                    { value: 'baseline', label: 'Baseline' },
                  ]}
                />
                <InputField label="Gap" value={getStyleValue('gap')} onChange={(v) => updateStyle('gap', v)} />
                <InputField label="Flex Wrap" value={getStyleValue('flexWrap')} onChange={(v) => updateStyle('flexWrap', v)} placeholder="nowrap, wrap, wrap-reverse" />
              </>
            )}
            {(getStyleValue('display') === 'grid') && (
              <>
                <InputField label="Grid Template Columns" value={getStyleValue('gridTemplateColumns')} onChange={(v) => updateStyle('gridTemplateColumns', v)} placeholder="repeat(3, 1fr)" />
                <InputField label="Grid Template Rows" value={getStyleValue('gridTemplateRows')} onChange={(v) => updateStyle('gridTemplateRows', v)} />
                <InputField label="Grid Gap" value={getStyleValue('gap')} onChange={(v) => updateStyle('gap', v)} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Dimensions */}
      <div>
        <SectionHeader
          title="Dimensions"
          isExpanded={expandedSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
        />
        {expandedSections.dimensions && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Width" value={getStyleValue('width')} onChange={(v) => updateStyle('width', v)} />
              <InputField label="Height" value={getStyleValue('height')} onChange={(v) => updateStyle('height', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Min Width" value={getStyleValue('minWidth')} onChange={(v) => updateStyle('minWidth', v)} />
              <InputField label="Min Height" value={getStyleValue('minHeight')} onChange={(v) => updateStyle('minHeight', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Max Width" value={getStyleValue('maxWidth')} onChange={(v) => updateStyle('maxWidth', v)} />
              <InputField label="Max Height" value={getStyleValue('maxHeight')} onChange={(v) => updateStyle('maxHeight', v)} />
            </div>
            <SelectField
              label="Box Sizing"
              value={getStyleValue('boxSizing') as string || 'content-box'}
              onChange={(v) => updateStyle('boxSizing', v)}
              options={[
                { value: 'content-box', label: 'Content Box' },
                { value: 'border-box', label: 'Border Box' },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  )

  // Typography Tab
  const renderTypographyTab = () => (
    <div className="space-y-4">
      <InputField
        label="Font Family"
        value={getStyleValue('fontFamily')}
        onChange={(v) => updateStyle('fontFamily', v)}
        placeholder="Arial, sans-serif"
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Font Size"
          value={localComponent?.props?.fontSize || getStyleValue('fontSize')}
          onChange={(v) => {
            updateProp('fontSize', v)
            updateStyle('fontSize', v)
          }}
          placeholder="16px, 1rem, 1.2em"
        />
        <InputField
          label="Font Weight"
          value={getStyleValue('fontWeight')}
          onChange={(v) => updateStyle('fontWeight', v)}
          placeholder="400, bold, 700"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Line Height"
          value={getStyleValue('lineHeight')}
          onChange={(v) => updateStyle('lineHeight', v)}
          placeholder="1.5, 24px"
        />
        <InputField
          label="Letter Spacing"
          value={getStyleValue('letterSpacing')}
          onChange={(v) => updateStyle('letterSpacing', v)}
          placeholder="0.5px, 0.1em"
        />
      </div>
      <SelectField
        label="Text Align"
        value={localComponent?.props?.align || (getStyleValue('textAlign') as string) || 'left'}
        onChange={(v) => {
          updateProp('align', v)
          updateStyle('textAlign', v)
        }}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' },
        ]}
      />
      <SelectField
        label="Text Transform"
        value={getStyleValue('textTransform') as string || 'none'}
        onChange={(v) => updateStyle('textTransform', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'uppercase', label: 'Uppercase' },
          { value: 'lowercase', label: 'Lowercase' },
          { value: 'capitalize', label: 'Capitalize' },
        ]}
      />
      <SelectField
        label="Text Decoration"
        value={getStyleValue('textDecoration') as string || 'none'}
        onChange={(v) => updateStyle('textDecoration', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'underline', label: 'Underline' },
          { value: 'overline', label: 'Overline' },
          { value: 'line-through', label: 'Line Through' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Text Indent" value={getStyleValue('textIndent')} onChange={(v) => updateStyle('textIndent', v)} />
        <InputField label="Word Spacing" value={getStyleValue('wordSpacing')} onChange={(v) => updateStyle('wordSpacing', v)} />
      </div>
    </div>
  )

  // Colors Tab
  const renderColorsTab = () => (
    <div className="space-y-4">
      <ColorPicker
        label="Text Color"
        value={localComponent?.props?.color || (getStyleValue('color') as string) || '#000000'}
        onChange={(v) => {
          updateProp('color', v)
          updateStyle('color', v)
        }}
      />
      <ColorPicker
        label="Background Color"
        value={localComponent.props?.background || (getStyleValue('backgroundColor') as string) || '#ffffff'}
        onChange={(v) => {
          updateProp('background', v)
          updateStyle('backgroundColor', v)
        }}
      />
      <InputField
        label="Background Image"
        value={getStyleValue('backgroundImage')}
        onChange={(v) => updateStyle('backgroundImage', v)}
        placeholder="url('image.jpg')"
      />
      <SelectField
        label="Background Size"
        value={getStyleValue('backgroundSize') as string || 'auto'}
        onChange={(v) => updateStyle('backgroundSize', v)}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'cover', label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: '100% 100%', label: '100% 100%' },
        ]}
      />
      <SelectField
        label="Background Position"
        value={getStyleValue('backgroundPosition') as string || 'center'}
        onChange={(v) => updateStyle('backgroundPosition', v)}
        options={[
          { value: 'center', label: 'Center' },
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'top left', label: 'Top Left' },
          { value: 'top right', label: 'Top Right' },
          { value: 'bottom left', label: 'Bottom Left' },
          { value: 'bottom right', label: 'Bottom Right' },
        ]}
      />
      <SelectField
        label="Background Repeat"
        value={getStyleValue('backgroundRepeat') as string || 'no-repeat'}
        onChange={(v) => updateStyle('backgroundRepeat', v)}
        options={[
          { value: 'no-repeat', label: 'No Repeat' },
          { value: 'repeat', label: 'Repeat' },
          { value: 'repeat-x', label: 'Repeat X' },
          { value: 'repeat-y', label: 'Repeat Y' },
        ]}
      />
      <ColorPicker
        label="Opacity"
        value={getStyleValue('opacity') ? `rgba(0,0,0,${getStyleValue('opacity')})` : '#000000'}
        onChange={(v) => {
          // Extract opacity value from rgba or use as is
          const match = v.match(/rgba?\([^)]+,\s*([^)]+)\)/)
          updateStyle('opacity', match ? match[1] : v)
        }}
      />
      <InputField
        label="Opacity (0-1)"
        value={getStyleValue('opacity')}
        onChange={(v) => updateStyle('opacity', v)}
        type="number"
        min={0}
        max={1}
        step={0.1}
        placeholder="1"
      />
    </div>
  )

  // Borders Tab
  const renderBordersTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Border Width" value={getStyleValue('borderWidth')} onChange={(v) => updateStyle('borderWidth', v)} placeholder="1px" />
        <SelectField
          label="Border Style"
          value={getStyleValue('borderStyle') as string || 'solid'}
          onChange={(v) => updateStyle('borderStyle', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'double', label: 'Double' },
          ]}
        />
      </div>
      <ColorPicker
        label="Border Color"
        value={(getStyleValue('borderColor') as string) || '#000000'}
        onChange={(v) => updateStyle('borderColor', v)}
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Border Radius" value={getStyleValue('borderRadius')} onChange={(v) => updateStyle('borderRadius', v)} placeholder="4px" />
        <InputField label="Border Radius (Top Left)" value={getStyleValue('borderTopLeftRadius')} onChange={(v) => updateStyle('borderTopLeftRadius', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputField label="Border Radius (Top Right)" value={getStyleValue('borderTopRightRadius')} onChange={(v) => updateStyle('borderTopRightRadius', v)} />
        <InputField label="Border Radius (Bottom Left)" value={getStyleValue('borderBottomLeftRadius')} onChange={(v) => updateStyle('borderBottomLeftRadius', v)} />
      </div>
      <InputField label="Border Radius (Bottom Right)" value={getStyleValue('borderBottomRightRadius')} onChange={(v) => updateStyle('borderBottomRightRadius', v)} />
      
      {/* Shadows */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Shadows</h4>
        <InputField
          label="Box Shadow"
          value={getStyleValue('boxShadow')}
          onChange={(v) => updateStyle('boxShadow', v)}
          placeholder="0 2px 4px rgba(0,0,0,0.1)"
        />
        <InputField
          label="Text Shadow"
          value={getStyleValue('textShadow')}
          onChange={(v) => updateStyle('textShadow', v)}
          placeholder="1px 1px 2px rgba(0,0,0,0.1)"
        />
      </div>
    </div>
  )

  // Animation Tab - Combines Effects and Advanced
  const renderAnimationTab = () => (
    <div className="space-y-4">
      {/* Transforms */}
      <div>
        <SectionHeader
          title="Transforms & Transitions"
          isExpanded={expandedSections.effects}
          onToggle={() => toggleSection('effects')}
        />
        {expandedSections.effects && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Transform"
              value={getStyleValue('transform') ? 'custom' : 'none'}
              onChange={(v) => updateStyle('transform', v === 'none' ? undefined : v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'scale(1.1)', label: 'Scale Up' },
                { value: 'scale(0.9)', label: 'Scale Down' },
                { value: 'rotate(5deg)', label: 'Rotate Right' },
                { value: 'rotate(-5deg)', label: 'Rotate Left' },
                { value: 'translateX(10px)', label: 'Translate X' },
                { value: 'translateY(10px)', label: 'Translate Y' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {getStyleValue('transform') && (
              <InputField
                label="Custom Transform"
                value={getStyleValue('transform')}
                onChange={(v) => updateStyle('transform', v)}
                placeholder="scale(1.1) rotate(5deg)"
              />
            )}
            <InputField
              label="Transform Origin"
              value={getStyleValue('transformOrigin')}
              onChange={(v) => updateStyle('transformOrigin', v)}
              placeholder="center, top left, 50% 50%"
            />
            <InputField
              label="Transition"
              value={getStyleValue('transition')}
              onChange={(v) => updateStyle('transition', v)}
              placeholder="all 0.3s ease"
            />
            <InputField
              label="Transition Duration"
              value={getStyleValue('transitionDuration')}
              onChange={(v) => updateStyle('transitionDuration', v)}
              placeholder="0.3s"
            />
            <SelectField
              label="Transition Timing"
              value={getStyleValue('transitionTimingFunction') as string || 'ease'}
              onChange={(v) => updateStyle('transitionTimingFunction', v)}
              options={[
                { value: 'ease', label: 'Ease' },
                { value: 'linear', label: 'Linear' },
                { value: 'ease-in', label: 'Ease In' },
                { value: 'ease-out', label: 'Ease Out' },
                { value: 'ease-in-out', label: 'Ease In Out' },
              ]}
            />
            <InputField
              label="Animation"
              value={getStyleValue('animation')}
              onChange={(v) => updateStyle('animation', v)}
              placeholder="fadeIn 1s ease"
            />
          </div>
        )}
      </div>

      {/* Other Effects */}
      <div>
        <SectionHeader
          title="Other Effects"
          isExpanded={expandedSections.otherEffects}
          onToggle={() => toggleSection('otherEffects')}
        />
        {expandedSections.otherEffects && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <SelectField
              label="Cursor"
              value={getStyleValue('cursor') as string || 'default'}
              onChange={(v) => updateStyle('cursor', v)}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'pointer', label: 'Pointer' },
                { value: 'text', label: 'Text' },
                { value: 'move', label: 'Move' },
                { value: 'not-allowed', label: 'Not Allowed' },
                { value: 'grab', label: 'Grab' },
              ]}
            />
            <SelectField
              label="Overflow"
              value={getStyleValue('overflow') as string || 'visible'}
              onChange={(v) => updateStyle('overflow', v)}
              options={[
                { value: 'visible', label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'scroll', label: 'Scroll' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
            <InputField
              label="Overflow X"
              value={getStyleValue('overflowX')}
              onChange={(v) => updateStyle('overflowX', v)}
              placeholder="hidden, scroll, auto"
            />
            <InputField
              label="Overflow Y"
              value={getStyleValue('overflowY')}
              onChange={(v) => updateStyle('overflowY', v)}
              placeholder="hidden, scroll, auto"
            />
          </div>
        )}
      </div>

      {/* Advanced CSS */}
      <div>
        <SectionHeader
          title="Advanced CSS"
          isExpanded={expandedSections.advanced}
          onToggle={() => toggleSection('advanced')}
        />
        {expandedSections.advanced && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Custom CSS Class</label>
              <input
                type="text"
                value={localComponent?.className || ''}
                onChange={(e) => {
                  const updated = { ...localComponent, className: e.target.value }
                  setLocalComponent(updated)
                  onUpdate(updated)
                }}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                placeholder="my-custom-class"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Inline Styles (JSON)</label>
              <textarea
                value={JSON.stringify(localComponent?.style || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    const updated = { ...localComponent, style: parsed }
                    setLocalComponent(updated)
                    onUpdate(updated)
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                rows={8}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base font-mono border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                placeholder='{"margin": "10px", "padding": "20px"}'
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5">Edit as JSON object</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Effects Tab (keep for backward compatibility but merge into Animation)
  const renderEffectsTab = () => (
    <div className="space-y-4">
      <SelectField
        label="Transform"
        value={getStyleValue('transform') ? 'custom' : 'none'}
        onChange={(v) => updateStyle('transform', v === 'none' ? undefined : v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'scale(1.1)', label: 'Scale Up' },
          { value: 'scale(0.9)', label: 'Scale Down' },
          { value: 'rotate(5deg)', label: 'Rotate Right' },
          { value: 'rotate(-5deg)', label: 'Rotate Left' },
          { value: 'translateX(10px)', label: 'Translate X' },
          { value: 'translateY(10px)', label: 'Translate Y' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {getStyleValue('transform') && (
        <InputField
          label="Custom Transform"
          value={getStyleValue('transform')}
          onChange={(v) => updateStyle('transform', v)}
          placeholder="scale(1.1) rotate(5deg)"
        />
      )}
      <InputField
        label="Transform Origin"
        value={getStyleValue('transformOrigin')}
        onChange={(v) => updateStyle('transformOrigin', v)}
        placeholder="center, top left, 50% 50%"
      />
      <InputField
        label="Transition"
        value={getStyleValue('transition')}
        onChange={(v) => updateStyle('transition', v)}
        placeholder="all 0.3s ease"
      />
      <InputField
        label="Transition Duration"
        value={getStyleValue('transitionDuration')}
        onChange={(v) => updateStyle('transitionDuration', v)}
        placeholder="0.3s"
      />
      <SelectField
        label="Transition Timing"
        value={getStyleValue('transitionTimingFunction') as string || 'ease'}
        onChange={(v) => updateStyle('transitionTimingFunction', v)}
        options={[
          { value: 'ease', label: 'Ease' },
          { value: 'linear', label: 'Linear' },
          { value: 'ease-in', label: 'Ease In' },
          { value: 'ease-out', label: 'Ease Out' },
          { value: 'ease-in-out', label: 'Ease In Out' },
        ]}
      />
      <InputField
        label="Animation"
        value={getStyleValue('animation')}
        onChange={(v) => updateStyle('animation', v)}
        placeholder="fadeIn 1s ease"
      />
      <SelectField
        label="Cursor"
        value={getStyleValue('cursor') as string || 'default'}
        onChange={(v) => updateStyle('cursor', v)}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'pointer', label: 'Pointer' },
          { value: 'text', label: 'Text' },
          { value: 'move', label: 'Move' },
          { value: 'not-allowed', label: 'Not Allowed' },
          { value: 'grab', label: 'Grab' },
        ]}
      />
      <SelectField
        label="Overflow"
        value={getStyleValue('overflow') as string || 'visible'}
        onChange={(v) => updateStyle('overflow', v)}
        options={[
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'scroll', label: 'Scroll' },
          { value: 'auto', label: 'Auto' },
        ]}
      />
      <InputField
        label="Overflow X"
        value={getStyleValue('overflowX')}
        onChange={(v) => updateStyle('overflowX', v)}
        placeholder="hidden, scroll, auto"
      />
      <InputField
        label="Overflow Y"
        value={getStyleValue('overflowY')}
        onChange={(v) => updateStyle('overflowY', v)}
        placeholder="hidden, scroll, auto"
      />
    </div>
  )

  // Advanced Tab - Custom CSS
  const renderAdvancedTab = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Custom CSS Class</label>
          <input
            type="text"
            value={localComponent?.className || ''}
            onChange={(e) => {
              const updated = { ...localComponent, className: e.target.value }
              setLocalComponent(updated)
              onUpdate(updated)
            }}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            placeholder="my-custom-class"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Inline Styles (JSON)</label>
          <textarea
            value={JSON.stringify(localComponent?.style || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                const updated = { ...localComponent, style: parsed }
                setLocalComponent(updated)
                onUpdate(updated)
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            rows={12}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base font-mono border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            placeholder='{"margin": "10px", "padding": "20px"}'
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5">Edit as JSON object</p>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'content', label: 'Content', icon: FiType },
    { id: 'style', label: 'Style', icon: FiDroplet },
    { id: 'animation', label: 'Animation', icon: FiZap },
  ]

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Properties</h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1 capitalize">{component.type}</p>
          </div>
          <button
            onClick={() => onDelete(component.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Delete Component"
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex bg-gray-50">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#ff6b35] text-[#ff6b35] bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'style' && renderStyleTab()}
        {activeTab === 'animation' && renderAnimationTab()}
      </div>
    </div>
  )
}
