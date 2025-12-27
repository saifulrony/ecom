'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Component } from './types'
import { FiTrash2, FiChevronDown, FiChevronUp, FiCode, FiType, FiDroplet, FiZap, FiUpload, FiX, FiImage, FiPlus } from 'react-icons/fi'
import Image from 'next/image'
import { adminAPI } from '@/lib/api'
import { gridTemplates, generateCellsForTemplate } from './GridComponent'
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
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set())
  const slideFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // Use refs to store debounce timers (declare before useEffect that uses them)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const styleUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track if we're updating from this component to avoid resetting state
  const isInternalUpdateRef = useRef(false)
  // Track the component ID to detect when a different component is selected
  const currentComponentIdRef = useRef<string | null>(null)
  // Track which input field is currently focused to prevent resets
  const focusedInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  // Track the last update time to prevent rapid resets
  const lastUpdateTimeRef = useRef<number>(0)
  // Animation preview state
  const [previewingAnimation, setPreviewingAnimation] = useState<string | null>(null)
  const animationPreviewRef = useRef<HTMLDivElement | null>(null)
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
    animationTypes: true,
    animationControls: false,
  })

  useEffect(() => {
    // Only update localComponent if:
    // 1. Component is null (deselected)
    // 2. Component ID changed (different component selected)
    // 3. Not an internal update (to avoid resetting while typing)
    // 4. No input is currently focused
    const componentId = component?.id || null
    const now = Date.now()
    
    // Skip update if:
    // - This is an internal update (user is typing)
    // - An input is currently focused
    // - Update happened very recently (within 500ms)
    if (isInternalUpdateRef.current || 
        focusedInputRef.current !== null ||
        (now - lastUpdateTimeRef.current < 500)) {
      return
    }
    
    if (!component) {
      setLocalComponent(null)
      setImagePreview('')
      currentComponentIdRef.current = null
    } else if (componentId !== currentComponentIdRef.current) {
      // Different component selected - update local state
      setLocalComponent(component)
      currentComponentIdRef.current = componentId
      // Set image preview if component has an image src
      if (component.props?.src) {
        setImagePreview(component.props.src)
      } else {
        setImagePreview('')
      }
    }
    // Don't update localComponent if component ID is the same and it's not an internal update
    // This prevents resetting the input while user is typing
    
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

  const handleSlideImageUpload = async (file: File, slideId: string): Promise<void> => {
    const url = await handleImageUpload(file)
    if (url && localComponent && localComponent.children) {
      const updated = {
        ...localComponent,
        children: localComponent.children.map(s =>
          s.id === slideId ? { ...s, props: { ...s.props, image: url } } : s
        ),
      }
      setLocalComponent(updated)
      onUpdate(updated)
    }
    // Reset input
    if (slideFileInputRefs.current[slideId]) {
      slideFileInputRefs.current[slideId].value = ''
    }
  }

  const toggleSlideExpansion = (slideId: string) => {
    setExpandedSlides(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slideId)) {
        newSet.delete(slideId)
      } else {
        newSet.add(slideId)
      }
      return newSet
    })
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
    
    // Mark as internal update BEFORE updating state
    isInternalUpdateRef.current = true
    lastUpdateTimeRef.current = Date.now()
    
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
      // Keep flag set for a bit longer to prevent useEffect from resetting
      setTimeout(() => {
        isInternalUpdateRef.current = false
      }, 200)
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
    
    // Mark as internal update BEFORE updating state
    isInternalUpdateRef.current = true
    lastUpdateTimeRef.current = Date.now()
    
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
      // Keep flag set for a bit longer to prevent useEffect from resetting
      setTimeout(() => {
        isInternalUpdateRef.current = false
      }, 200)
    }, 300)
  }

  const updateContent = (value: string) => {
    if (!localComponent) return
    
    // Mark as internal update BEFORE updating state
    isInternalUpdateRef.current = true
    
    const updated = {
      ...localComponent,
      content: value,
    }
    setLocalComponent(updated)
    onUpdate(updated)
    // Keep flag set for a bit longer to prevent useEffect from resetting
    setTimeout(() => {
      isInternalUpdateRef.current = false
    }, 100)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      // Accordion behavior: close all sections first, then open the clicked one if it wasn't already open
      const newState: Record<string, boolean> = {}
      Object.keys(prev).forEach(key => {
        newState[key] = false
      })
      // If the clicked section was closed, open it
      if (!prev[section]) {
        newState[section] = true
      }
      return newState
    })
  }

  const getStyleValue = (key: string) => {
    return localComponent?.style?.[key as keyof React.CSSProperties] || ''
  }

  // Reusable Input Components - Memoized to prevent unnecessary re-renders
  const InputField = React.memo(({ label, value, onChange, type = 'text', placeholder = '', min, max, step }: {
    label: string
    value: any
    onChange: (value: any) => void
    type?: string
    placeholder?: string
    min?: number
    max?: number
    step?: number
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [localValue, setLocalValue] = useState(value != null ? String(value) : '')
    const isFocusedRef = useRef(false)
    const lastPropValueRef = useRef(value)
    
    // Only sync from prop when not focused and value actually changed externally
    useEffect(() => {
      const newValue = value != null ? String(value) : ''
      
      // Only update if:
      // 1. Value actually changed from external source
      // 2. Input is not currently focused
      // 3. The prop value is different from what we last saw
      if (!isFocusedRef.current && newValue !== lastPropValueRef.current && newValue !== localValue) {
        setLocalValue(newValue)
        lastPropValueRef.current = value
      }
    }, [value])
    
    // For number inputs, keep as string to allow values like "100px"
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setLocalValue(inputValue)
      
      if (type === 'number') {
        // Only convert to number if it's a pure number, otherwise keep as string
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
        onChange(inputValue)
      }
      lastPropValueRef.current = inputValue
    }
    
    const handleFocus = () => {
      isFocusedRef.current = true
      focusedInputRef.current = inputRef.current
    }
    
    const handleBlur = () => {
      isFocusedRef.current = false
      if (focusedInputRef.current === inputRef.current) {
        focusedInputRef.current = null
      }
      // Sync value on blur
      const newValue = value != null ? String(value) : ''
      setLocalValue(newValue)
      lastPropValueRef.current = value
    }

    return (
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <input
          ref={inputRef}
          type={type === 'number' ? 'text' : type}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
        />
      </div>
    )
  })

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer hover:border-[#ff6b35] transition-colors flex-shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
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

  // Spacing input group with shared unit selector (for margin/padding)
  const SpacingInputGroup = React.memo(({ 
    title, 
    topValue, 
    rightValue, 
    bottomValue, 
    leftValue, 
    onTopChange, 
    onRightChange, 
    onBottomChange, 
    onLeftChange 
  }: {
    title: string
    topValue: string | number | undefined
    rightValue: string | number | undefined
    bottomValue: string | number | undefined
    leftValue: string | number | undefined
    onTopChange: (value: string) => void
    onRightChange: (value: string) => void
    onBottomChange: (value: string) => void
    onLeftChange: (value: string) => void
  }) => {
    // Helper to parse value (extract number)
    const parseValue = (value: string | number | undefined): string => {
      if (!value) return ''
      const strVal = String(value).trim()
      const match = strVal.match(/^(-?\d*\.?\d+)(px|em|%|rem)?$/)
      return match ? match[1] : strVal.replace(/(px|em|%|rem)$/i, '')
    }
    
    // Extract unit from any existing value (default to px)
    const getInitialUnit = (): string => {
      const values = [topValue, rightValue, bottomValue, leftValue]
      for (const val of values) {
        if (val) {
          const strVal = String(val).trim()
          const match = strVal.match(/(px|em|%|rem)$/)
          if (match) return match[1]
        }
      }
      return 'px'
    }
    
    const [unit, setUnit] = useState(getInitialUnit)
    const topInputRef = useRef<HTMLInputElement>(null)
    const rightInputRef = useRef<HTMLInputElement>(null)
    const bottomInputRef = useRef<HTMLInputElement>(null)
    const leftInputRef = useRef<HTMLInputElement>(null)
    const [topLocal, setTopLocal] = useState(parseValue(topValue))
    const [rightLocal, setRightLocal] = useState(parseValue(rightValue))
    const [bottomLocal, setBottomLocal] = useState(parseValue(bottomValue))
    const [leftLocal, setLeftLocal] = useState(parseValue(leftValue))
    const focusedRef = useRef<HTMLInputElement | null>(null)
    
    // Sync local values when props change (if not focused)
    useEffect(() => {
      if (focusedRef.current !== topInputRef.current) setTopLocal(parseValue(topValue))
      if (focusedRef.current !== rightInputRef.current) setRightLocal(parseValue(rightValue))
      if (focusedRef.current !== bottomInputRef.current) setBottomLocal(parseValue(bottomValue))
      if (focusedRef.current !== leftInputRef.current) setLeftLocal(parseValue(leftValue))
    }, [topValue, rightValue, bottomValue, leftValue])
    
    const handleInputChange = (
      value: string, 
      setLocal: (v: string) => void, 
      onChange: (v: string) => void
    ) => {
      setLocal(value)
      onChange(value === '' ? '' : `${value}${unit}`)
    }
    
    const handleBlur = (
      value: string,
      setLocal: (v: string) => void,
      onChange: (v: string) => void
    ) => {
      const cleanValue = value.replace(/(px|em|%|rem)$/i, '')
      setLocal(cleanValue)
      onChange(cleanValue === '' ? '' : `${cleanValue}${unit}`)
      focusedRef.current = null
    }
    
    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value
      setUnit(newUnit)
      
      // Update all fields with new unit
      const updateField = (value: string, onChange: (v: string) => void) => {
        if (value) {
          const num = value.replace(/(px|em|%|rem)$/i, '')
          if (num) onChange(`${num}${newUnit}`)
        }
      }
      
      updateField(topLocal, onTopChange)
      updateField(rightLocal, onRightChange)
      updateField(bottomLocal, onBottomChange)
      updateField(leftLocal, onLeftChange)
    }
    
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</label>
          <select
            value={unit}
            onChange={handleUnitChange}
            className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent cursor-pointer"
          >
            <option value="px">px</option>
            <option value="em">em</option>
            <option value="%">%</option>
            <option value="rem">rem</option>
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Top</label>
            <input
              ref={topInputRef}
              type="text"
              value={topLocal}
              onChange={(e) => handleInputChange(e.target.value, setTopLocal, onTopChange)}
              onFocus={() => { focusedRef.current = topInputRef.current }}
              onBlur={() => handleBlur(topLocal, setTopLocal, onTopChange)}
              placeholder="0"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Right</label>
            <input
              ref={rightInputRef}
              type="text"
              value={rightLocal}
              onChange={(e) => handleInputChange(e.target.value, setRightLocal, onRightChange)}
              onFocus={() => { focusedRef.current = rightInputRef.current }}
              onBlur={() => handleBlur(rightLocal, setRightLocal, onRightChange)}
              placeholder="0"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bottom</label>
            <input
              ref={bottomInputRef}
              type="text"
              value={bottomLocal}
              onChange={(e) => handleInputChange(e.target.value, setBottomLocal, onBottomChange)}
              onFocus={() => { focusedRef.current = bottomInputRef.current }}
              onBlur={() => handleBlur(bottomLocal, setBottomLocal, onBottomChange)}
              placeholder="0"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Left</label>
            <input
              ref={leftInputRef}
              type="text"
              value={leftLocal}
              onChange={(e) => handleInputChange(e.target.value, setLeftLocal, onLeftChange)}
              onFocus={() => { focusedRef.current = leftInputRef.current }}
              onBlur={() => handleBlur(leftLocal, setLeftLocal, onLeftChange)}
              placeholder="0"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
            />
          </div>
        </div>
      </div>
    )
  })

  // Input field with unit selector (px, em, %, rem)
  const InputWithUnit = React.memo(({ label, value, onChange }: {
    label: string
    value: string | number | undefined
    onChange: (value: string) => void
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [localValue, setLocalValue] = useState('')
    const [unit, setUnit] = useState('px')
    const isFocusedRef = useRef(false)
    const lastPropValueRef = useRef(value)
    
    // Parse value to extract number and unit
    useEffect(() => {
      const strValue = value != null ? String(value).trim() : ''
      
      // Only update if value changed externally and input is not focused
      if (!isFocusedRef.current && strValue !== String(lastPropValueRef.current || '')) {
        // Match patterns like "10px", "10", "10.5em", "10%", etc.
        const match = strValue.match(/^(-?\d*\.?\d+)(px|em|%|rem)?$/)
        
        if (match) {
          const numValue = match[1]
          const extractedUnit = match[2] || 'px'
          setLocalValue(numValue)
          setUnit(extractedUnit)
        } else if (strValue === '') {
          setLocalValue('')
          setUnit('px')
        } else {
          // If value doesn't match pattern, just display it as is
          setLocalValue(strValue)
          setUnit('px')
        }
        lastPropValueRef.current = value
      }
    }, [value])
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setLocalValue(inputValue)
      // Combine number and unit, or just use empty string if input is empty
      const combinedValue = inputValue === '' ? '' : `${inputValue}${unit}`
      onChange(combinedValue)
    }
    
    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value
      setUnit(newUnit)
      // Update value with new unit only if we have a number value
      if (localValue !== '') {
        const combinedValue = `${localValue}${newUnit}`
        onChange(combinedValue)
        lastPropValueRef.current = combinedValue
      }
    }
    
    const handleFocus = () => {
      isFocusedRef.current = true
      focusedInputRef.current = inputRef.current
    }
    
    const handleBlur = () => {
      isFocusedRef.current = false
      if (focusedInputRef.current === inputRef.current) {
        focusedInputRef.current = null
      }
      // Ensure value is properly formatted on blur
      if (localValue !== '') {
        // Remove any trailing unit if user typed it manually
        const cleanValue = localValue.replace(/(px|em|%|rem)$/i, '')
        if (cleanValue !== localValue) {
          setLocalValue(cleanValue)
        }
        const combinedValue = `${cleanValue}${unit}`
        onChange(combinedValue)
        lastPropValueRef.current = combinedValue
      } else {
        onChange('')
        lastPropValueRef.current = ''
      }
    }

    return (
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="flex items-stretch">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="0"
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-l-lg rounded-r-none text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
          />
          <select
            value={unit}
            onChange={handleUnitChange}
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-l-0 border-gray-300 rounded-r-lg rounded-l-none text-gray-900 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent cursor-pointer"
          >
            <option value="px">px</option>
            <option value="em">em</option>
            <option value="%">%</option>
            <option value="rem">rem</option>
          </select>
        </div>
      </div>
    )
  })

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
    
    switch (localComponent.type) {
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
          </div>
        )

      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Text</label>
              <textarea
                value={localComponent?.props?.text || localComponent?.content || ''}
                onFocus={() => { focusedInputRef.current = document.activeElement as HTMLTextAreaElement }}
                onBlur={() => { if (focusedInputRef.current === document.activeElement) focusedInputRef.current = null }}
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
                onFocus={() => { focusedInputRef.current = document.activeElement as HTMLTextAreaElement }}
                onBlur={() => { if (focusedInputRef.current === document.activeElement) focusedInputRef.current = null }}
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
                  
                  // Generate cells for the template using the helper function
                  if (localComponent) {
                    const generateId = () => `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    const newCells = generateCellsForTemplate(val, generateId)
                    
                    const updated = {
                      ...localComponent,
                      children: newCells,
                      props: {
                        ...localComponent.props,
                        template: val,
                        columns: template.columns,
                        rows: template.rows,
                        useCustomWidths: false, // Only enable when cells are resized
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
                { value: 'layout-1', label: 'Layout 1: Full-Width Hero' },
                { value: 'layout-2', label: 'Layout 2: Split Hero (50/50)' },
                { value: 'layout-3', label: 'Layout 3: Asymmetric Hero (2/3 + 1/3)' },
                { value: 'layout-4', label: 'Layout 4: Three Equal Columns' },
                { value: 'layout-5', label: 'Layout 5: Four Equal Columns' },
                { value: 'layout-6', label: 'Layout 6: Masonry Large Left' },
                { value: 'layout-7', label: 'Layout 7: Masonry Large Right' },
                { value: 'layout-8', label: 'Layout 8: Gallery Grid (4x2)' },
                { value: 'layout-9', label: 'Layout 9: Complex Asymmetric' },
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
          <div className="space-y-4">
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
            
            {/* Customization Options */}
            <div className="pt-2 border-t border-gray-200 space-y-3">
              <label className="text-sm font-semibold text-gray-700 block">Display Options</label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900">Show Category</span>
                <input
                  type="checkbox"
                  checked={localComponent?.props?.showCategory !== false}
                  onChange={(e) => updateProp('showCategory', e.target.checked)}
                  className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35] focus:ring-2 cursor-pointer"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900">Show Wishlist Icon</span>
                <input
                  type="checkbox"
                  checked={localComponent?.props?.showWishlist !== false}
                  onChange={(e) => updateProp('showWishlist', e.target.checked)}
                  className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35] focus:ring-2 cursor-pointer"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900">Show Cart Button</span>
                <input
                  type="checkbox"
                  checked={localComponent?.props?.showCartButton !== false}
                  onChange={(e) => updateProp('showCartButton', e.target.checked)}
                  className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35] focus:ring-2 cursor-pointer"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900">Show View Details Icon</span>
                <input
                  type="checkbox"
                  checked={localComponent?.props?.showViewDetails === true}
                  onChange={(e) => updateProp('showViewDetails', e.target.checked)}
                  className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35] focus:ring-2 cursor-pointer"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900">Hide Out of Stock Products</span>
                <input
                  type="checkbox"
                  checked={localComponent?.props?.hideStockOut === true}
                  onChange={(e) => updateProp('hideStockOut', e.target.checked)}
                  className="w-4 h-4 text-[#ff6b35] rounded focus:ring-[#ff6b35] focus:ring-2 cursor-pointer"
                />
              </label>
            </div>
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

      case 'slider':
        return (
          <div className="flex flex-col h-full -m-4 sm:-m-6">
            <div className="pt-3 border-t border-gray-200 flex-shrink-0 px-4 sm:px-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  Slides ({localComponent?.children?.length || 0})
                </label>
                <button
                  onClick={() => {
                    if (localComponent) {
                      const generateId = () => `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                      const currentSlides = localComponent.children || []
                      const gradients = ['gradient-orange', 'gradient-primary', 'gradient-warm', 'gradient-cool']
                      const gradient = gradients[currentSlides.length % gradients.length]
                      
                      const newSlide: Component = {
                        id: generateId(),
                        type: 'banner',
                        props: {
                          title: `Slide ${currentSlides.length + 1}`,
                          subtitle: 'Add your subtitle here',
                          height: '500px',
                          gradient: gradient,
                        },
                      }
                      const updated = {
                        ...localComponent,
                        children: [...currentSlides, newSlide],
                      }
                      setLocalComponent(updated)
                      onUpdate(updated)
                      // Auto-expand the new slide
                      setExpandedSlides(prev => new Set([...prev, newSlide.id]))
                    }
                  }}
                  className="text-xs px-2.5 py-1.5 bg-[#ff6b35] text-white rounded hover:bg-[#ff8c5a] transition flex items-center gap-1.5"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Add Slide
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 min-h-0 px-4 sm:px-6 pb-4 sm:pb-6">
                {localComponent?.children?.map((slide, index) => {
                  const isExpanded = expandedSlides.has(slide.id)
                  const slideImage = slide.props?.image || ''
                  
                  return (
                    <div key={slide.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleSlideExpansion(slide.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <FiChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <FiChevronUp className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-700 truncate">
                            Slide {index + 1}: {slide.props?.title || 'Untitled'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (localComponent && localComponent.children) {
                              const updated = {
                                ...localComponent,
                                children: localComponent.children.filter(s => s.id !== slide.id),
                              }
                              setLocalComponent(updated)
                              onUpdate(updated)
                              // Remove from expanded set
                              setExpandedSlides(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(slide.id)
                                return newSet
                              })
                            }
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-colors flex-shrink-0 ml-2"
                          title="Delete Slide"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </button>
                      
                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 max-h-[400px] overflow-y-auto">
                          <div className="p-3 space-y-3">
                          <InputField
                            label="Title"
                            value={slide.props?.title || ''}
                            onChange={(val) => {
                              if (localComponent && localComponent.children) {
                                const updated = {
                                  ...localComponent,
                                  children: localComponent.children.map(s =>
                                    s.id === slide.id ? { ...s, props: { ...s.props, title: val } } : s
                                  ),
                                }
                                setLocalComponent(updated)
                                onUpdate(updated)
                              }
                            }}
                          />
                          <InputField
                            label="Subtitle"
                            value={slide.props?.subtitle || ''}
                            onChange={(val) => {
                              if (localComponent && localComponent.children) {
                                const updated = {
                                  ...localComponent,
                                  children: localComponent.children.map(s =>
                                    s.id === slide.id ? { ...s, props: { ...s.props, subtitle: val } } : s
                                  ),
                                }
                                setLocalComponent(updated)
                                onUpdate(updated)
                              }
                            }}
                          />
                          
                          {/* Image Upload Section */}
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                              Image
                            </label>
                            {slideImage ? (
                              <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-2 border border-gray-200">
                                <Image
                                  src={slideImage}
                                  alt="Slide preview"
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, 320px"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (localComponent && localComponent.children) {
                                      const updated = {
                                        ...localComponent,
                                        children: localComponent.children.map(s =>
                                          s.id === slide.id ? { ...s, props: { ...s.props, image: '' } } : s
                                        ),
                                      }
                                      setLocalComponent(updated)
                                      onUpdate(updated)
                                    }
                                    if (slideFileInputRefs.current[slide.id]) {
                                      slideFileInputRefs.current[slide.id].value = ''
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                                  aria-label="Remove image"
                                >
                                  <FiX className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-[#ff6b35] transition">
                                <FiImage className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                                <label className="cursor-pointer">
                                  <span className="text-xs text-gray-600 block mb-1.5">
                                    Click to upload image
                                  </span>
                                  <div className="inline-flex items-center space-x-1.5 bg-[#ff6b35] text-white px-2.5 py-1 rounded-lg hover:bg-[#ff8c5a] transition text-xs">
                                    <FiUpload className="w-3 h-3" />
                                    <span>Choose File</span>
                                  </div>
                                  <input
                                    ref={(el) => {
                                      slideFileInputRefs.current[slide.id] = el
                                    }}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        handleSlideImageUpload(file, slide.id)
                                      }
                                    }}
                                    disabled={uploading}
                                    className="hidden"
                                  />
                                </label>
                                {uploading && (
                                  <p className="text-xs text-gray-500 mt-1.5">Uploading...</p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <SelectField
                            label="Gradient (if no image)"
                            value={slide.props?.gradient || 'gradient-orange'}
                            onChange={(val) => {
                              if (localComponent && localComponent.children) {
                                const updated = {
                                  ...localComponent,
                                  children: localComponent.children.map(s =>
                                    s.id === slide.id ? { ...s, props: { ...s.props, gradient: val } } : s
                                  ),
                                }
                                setLocalComponent(updated)
                                onUpdate(updated)
                              }
                            }}
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
                            value={slide.props?.height || '500px'}
                            onChange={(val) => {
                              if (localComponent && localComponent.children) {
                                const updated = {
                                  ...localComponent,
                                  children: localComponent.children.map(s =>
                                    s.id === slide.id ? { ...s, props: { ...s.props, height: val } } : s
                                  ),
                                }
                                setLocalComponent(updated)
                                onUpdate(updated)
                              }
                            }}
                            placeholder="500px"
                          />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {(!localComponent?.children || localComponent.children.length === 0) && (
                  <div className="text-center text-gray-400 py-6 text-xs border border-gray-200 rounded-lg bg-gray-50">
                    <p className="font-medium mb-1">No slides added yet.</p>
                    <p className="text-gray-500">Click "Add Slide" to create your first slide.</p>
                  </div>
                )}
            </div>
          </div>
        )

      case 'spacer':
        return (
          <div className="space-y-3">
            <InputField
              label="Height"
              value={localComponent?.props?.height || '50px'}
              onChange={(val) => updateProp('height', val)}
              placeholder="50px"
            />
          </div>
        )

      case 'divider':
        return (
          <div className="space-y-3">
            <ColorPicker
              label="Color"
              value={localComponent?.props?.color || '#e5e7eb'}
              onChange={(val) => updateProp('color', val)}
            />
            <InputField
              label="Height"
              value={localComponent?.props?.height || '1px'}
              onChange={(val) => updateProp('height', val)}
              placeholder="1px"
            />
            <InputField
              label="Width"
              value={localComponent?.props?.width || '100%'}
              onChange={(val) => updateProp('width', val)}
              placeholder="100%"
            />
          </div>
        )

      case 'video':
        return (
          <div className="space-y-3">
            <InputField
              label="Video URL"
              value={localComponent?.props?.url || ''}
              onChange={(val) => updateProp('url', val)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <InputField
              label="Width"
              value={localComponent?.props?.width || '100%'}
              onChange={(val) => updateProp('width', val)}
              placeholder="100%"
            />
            <InputField
              label="Height"
              value={localComponent?.props?.height || '400px'}
              onChange={(val) => updateProp('height', val)}
              placeholder="400px"
            />
          </div>
        )

      case 'form':
      case 'contact-form':
        return (
          <div className="space-y-3">
            <InputField
              label="Form Title"
              value={localComponent?.props?.title || 'Contact Us'}
              onChange={(val) => updateProp('title', val)}
            />
            <InputField
              label="Submit Button Text"
              value={localComponent?.props?.submitText || 'Send Message'}
              onChange={(val) => updateProp('submitText', val)}
            />
          </div>
        )

      case 'newsletter':
        return (
          <div className="space-y-3">
            <InputField
              label="Title"
              value={localComponent?.props?.title || 'Subscribe to Newsletter'}
              onChange={(val) => updateProp('title', val)}
            />
            <InputField
              label="Placeholder"
              value={localComponent?.props?.placeholder || 'Enter your email'}
              onChange={(val) => updateProp('placeholder', val)}
            />
          </div>
        )

      case 'dropdown':
        return (
          <div className="space-y-3">
            <InputField
              label="Label"
              value={localComponent?.props?.label || 'Select Option'}
              onChange={(val) => updateProp('label', val)}
            />
            <InputField
              label="Placeholder"
              value={localComponent?.props?.placeholder || 'Choose an option'}
              onChange={(val) => updateProp('placeholder', val)}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Options (one per line)</label>
              <textarea
                value={(localComponent?.props?.options || ['Option 1', 'Option 2', 'Option 3']).join('\n')}
                onChange={(e) => {
                  const options = e.target.value.split('\n').filter(line => line.trim())
                  updateProp('options', options.length > 0 ? options : ['Option 1'])
                }}
                rows={5}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.required || false}
                onChange={(e) => updateProp('required', e.target.checked)}
                className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
              />
              <label className="text-sm text-gray-700">Required field</label>
            </div>
          </div>
        )

      case 'select':
        return (
          <div className="space-y-3">
            <InputField
              label="Name"
              value={localComponent?.props?.name || 'select'}
              onChange={(val) => updateProp('name', val)}
              placeholder="select"
            />
            <InputField
              label="ID"
              value={localComponent?.props?.id || localComponent?.props?.name || 'select'}
              onChange={(val) => updateProp('id', val)}
              placeholder="select"
            />
            <InputField
              label="Label"
              value={localComponent?.props?.label || ''}
              onChange={(val) => updateProp('label', val)}
              placeholder="Select Label (optional)"
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Options (one per line)</label>
              <textarea
                value={(localComponent?.props?.options || ['Option 1', 'Option 2', 'Option 3']).join('\n')}
                onChange={(e) => {
                  const options = e.target.value.split('\n').filter(line => line.trim())
                  updateProp('options', options.length > 0 ? options : ['Option 1'])
                }}
                rows={5}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
              <p className="text-xs text-gray-500 mt-1">Each line becomes an option. The value will be automatically generated from the option text.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.required || false}
                onChange={(e) => updateProp('required', e.target.checked)}
                className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
              />
              <label className="text-sm text-gray-700">Required field</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localComponent?.props?.multiple || false}
                onChange={(e) => updateProp('multiple', e.target.checked)}
                className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
              />
              <label className="text-sm text-gray-700">Allow multiple selections</label>
            </div>
          </div>
        )

      case 'product-search':
        return (
          <div className="space-y-3">
            <InputField
              label="Placeholder"
              value={localComponent?.props?.placeholder || 'Search products...'}
              onChange={(val) => updateProp('placeholder', val)}
            />
          </div>
        )

      case 'testimonials':
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <p>Testimonials are managed through the component children.</p>
            </div>
          </div>
        )

      case 'faq':
        return (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <p>FAQ items are managed through the component children.</p>
            </div>
          </div>
        )

      case 'code-block':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Code</label>
              <textarea
                value={localComponent?.props?.code || ''}
                onChange={(e) => updateProp('code', e.target.value)}
                rows={8}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base font-mono border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
                placeholder="// Your code here"
              />
            </div>
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.bgColor || '#1a1a1a'}
              onChange={(val) => updateProp('bgColor', val)}
            />
            <ColorPicker
              label="Text Color"
              value={localComponent?.props?.textColor || '#ffffff'}
              onChange={(val) => updateProp('textColor', val)}
            />
            <InputField
              label="Padding"
              value={localComponent?.props?.padding || '20px'}
              onChange={(val) => updateProp('padding', val)}
              placeholder="20px"
            />
          </div>
        )

      case 'alert':
        return (
          <div className="space-y-3">
            <InputField
              label="Alert Text"
              value={localComponent?.props?.text || localComponent?.content || ''}
              onChange={(val) => {
                updateProp('text', val)
                updateContent(val)
              }}
            />
            <SelectField
              label="Alert Type"
              value={localComponent?.props?.type || 'info'}
              onChange={(val) => updateProp('type', val)}
              options={[
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]}
            />
            <ColorPicker
              label="Background Color"
              value={localComponent?.props?.bgColor || ''}
              onChange={(val) => updateProp('bgColor', val)}
            />
            <ColorPicker
              label="Border Color"
              value={localComponent?.props?.borderColor || ''}
              onChange={(val) => updateProp('borderColor', val)}
            />
            <ColorPicker
              label="Text Color"
              value={localComponent?.props?.textColor || ''}
              onChange={(val) => updateProp('textColor', val)}
            />
          </div>
        )

      case 'social-icons':
        return (
          <div className="space-y-3">
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
            <div className="text-sm text-gray-600">
              <p>Social media platforms are managed through the component props.</p>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center text-gray-500 py-8 text-sm">
            <p>No content properties for this component type.</p>
            <p className="text-xs mt-2 text-gray-400">Component type: {localComponent?.type}</p>
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
          <div className="space-y-4 mt-2 pl-2 border-l-2 border-gray-200">
            <SpacingInputGroup
              title="Margin"
              topValue={getStyleValue('marginTop')}
              rightValue={getStyleValue('marginRight')}
              bottomValue={getStyleValue('marginBottom')}
              leftValue={getStyleValue('marginLeft')}
              onTopChange={(v) => updateStyle('marginTop', v)}
              onRightChange={(v) => updateStyle('marginRight', v)}
              onBottomChange={(v) => updateStyle('marginBottom', v)}
              onLeftChange={(v) => updateStyle('marginLeft', v)}
            />
            <SpacingInputGroup
              title="Padding"
              topValue={getStyleValue('paddingTop')}
              rightValue={getStyleValue('paddingRight')}
              bottomValue={getStyleValue('paddingBottom')}
              leftValue={getStyleValue('paddingLeft')}
              onTopChange={(v) => updateStyle('paddingTop', v)}
              onRightChange={(v) => updateStyle('paddingRight', v)}
              onBottomChange={(v) => updateStyle('paddingBottom', v)}
              onLeftChange={(v) => updateStyle('paddingLeft', v)}
            />
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

  // Animation definitions with preview support
  const animationPresets = {
    // Entry Animations
    fadeIn: { name: 'Fade In', keyframes: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }', animation: 'fadeIn 0.6s ease-in' },
    fadeInUp: { name: 'Fade In Up', keyframes: '@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }', animation: 'fadeInUp 0.6s ease-out' },
    fadeInDown: { name: 'Fade In Down', keyframes: '@keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }', animation: 'fadeInDown 0.6s ease-out' },
    fadeInLeft: { name: 'Fade In Left', keyframes: '@keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }', animation: 'fadeInLeft 0.6s ease-out' },
    fadeInRight: { name: 'Fade In Right', keyframes: '@keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }', animation: 'fadeInRight 0.6s ease-out' },
    slideInUp: { name: 'Slide In Up', keyframes: '@keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }', animation: 'slideInUp 0.5s ease-out' },
    slideInDown: { name: 'Slide In Down', keyframes: '@keyframes slideInDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }', animation: 'slideInDown 0.5s ease-out' },
    slideInLeft: { name: 'Slide In Left', keyframes: '@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }', animation: 'slideInLeft 0.5s ease-out' },
    slideInRight: { name: 'Slide In Right', keyframes: '@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }', animation: 'slideInRight 0.5s ease-out' },
    zoomIn: { name: 'Zoom In', keyframes: '@keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }', animation: 'zoomIn 0.5s ease-out' },
    zoomOut: { name: 'Zoom Out', keyframes: '@keyframes zoomOut { from { opacity: 0; transform: scale(1.5); } to { opacity: 1; transform: scale(1); } }', animation: 'zoomOut 0.5s ease-out' },
    bounceIn: { name: 'Bounce In', keyframes: '@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }', animation: 'bounceIn 0.6s ease-out' },
    bounceInUp: { name: 'Bounce In Up', keyframes: '@keyframes bounceInUp { 0% { opacity: 0; transform: translateY(60px); } 60% { opacity: 1; transform: translateY(-10px); } 80% { transform: translateY(5px); } 100% { transform: translateY(0); } }', animation: 'bounceInUp 0.8s ease-out' },
    bounceInDown: { name: 'Bounce In Down', keyframes: '@keyframes bounceInDown { 0% { opacity: 0; transform: translateY(-60px); } 60% { opacity: 1; transform: translateY(10px); } 80% { transform: translateY(-5px); } 100% { transform: translateY(0); } }', animation: 'bounceInDown 0.8s ease-out' },
    rotateIn: { name: 'Rotate In', keyframes: '@keyframes rotateIn { from { opacity: 0; transform: rotate(-200deg); } to { opacity: 1; transform: rotate(0); } }', animation: 'rotateIn 0.6s ease-out' },
    flipInX: { name: 'Flip In X', keyframes: '@keyframes flipInX { from { opacity: 0; transform: perspective(400px) rotateX(90deg); } to { opacity: 1; transform: perspective(400px) rotateX(0); } }', animation: 'flipInX 0.6s ease-out' },
    flipInY: { name: 'Flip In Y', keyframes: '@keyframes flipInY { from { opacity: 0; transform: perspective(400px) rotateY(90deg); } to { opacity: 1; transform: perspective(400px) rotateY(0); } }', animation: 'flipInY 0.6s ease-out' },
    // Hover Animations
    pulse: { name: 'Pulse', keyframes: '@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }', animation: 'pulse 2s ease-in-out infinite' },
    bounce: { name: 'Bounce', keyframes: '@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }', animation: 'bounce 1s ease-in-out infinite' },
    shake: { name: 'Shake', keyframes: '@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }', animation: 'shake 0.5s ease-in-out infinite' },
    swing: { name: 'Swing', keyframes: '@keyframes swing { 20% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }', animation: 'swing 1s ease-in-out infinite' },
    wobble: { name: 'Wobble', keyframes: '@keyframes wobble { 0% { transform: translateX(0%); } 15% { transform: translateX(-25px) rotate(-5deg); } 30% { transform: translateX(20px) rotate(3deg); } 45% { transform: translateX(-15px) rotate(-3deg); } 60% { transform: translateX(10px) rotate(2deg); } 75% { transform: translateX(-5px) rotate(-1deg); } 100% { transform: translateX(0%); } }', animation: 'wobble 1s ease-in-out infinite' },
    rubber: { name: 'Rubber', keyframes: '@keyframes rubber { 0% { transform: scale(1); } 30% { transform: scaleX(1.25) scaleY(0.75); } 40% { transform: scaleX(0.75) scaleY(1.25); } 50% { transform: scaleX(1.15) scaleY(0.85); } 65% { transform: scaleX(0.95) scaleY(1.05); } 75% { transform: scaleX(1.05) scaleY(0.95); } 100% { transform: scale(1); } }', animation: 'rubber 0.8s ease-in-out infinite' },
    flash: { name: 'Flash', keyframes: '@keyframes flash { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0; } }', animation: 'flash 1s ease-in-out infinite' },
    heartBeat: { name: 'Heart Beat', keyframes: '@keyframes heartBeat { 0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }', animation: 'heartBeat 1.5s ease-in-out infinite' },
    // Advanced Animations
    float: { name: 'Float', keyframes: '@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }', animation: 'float 3s ease-in-out infinite' },
    glow: { name: 'Glow', keyframes: '@keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 107, 53, 0.5); } 50% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.8), 0 0 30px rgba(255, 107, 53, 0.6); } }', animation: 'glow 2s ease-in-out infinite' },
    gradientShift: { name: 'Gradient Shift', keyframes: '@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }', animation: 'gradientShift 3s ease infinite', note: 'Requires gradient background' },
    rotate: { name: 'Rotate', keyframes: '@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }', animation: 'rotate 2s linear infinite' },
    spin: { name: 'Spin', keyframes: '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }', animation: 'spin 1s linear infinite' },
    ping: { name: 'Ping', keyframes: '@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' },
    scale: { name: 'Scale', keyframes: '@keyframes scale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }', animation: 'scale 2s ease-in-out infinite' },
    slide: { name: 'Slide', keyframes: '@keyframes slide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(20px); } }', animation: 'slide 2s ease-in-out infinite' },
  }

  // Preview animation function
  const previewAnimation = (animationKey: string) => {
    if (!animationPreviewRef.current) return
    
    const animation = animationPresets[animationKey as keyof typeof animationPresets]
    if (!animation) return
    
    setPreviewingAnimation(animationKey)
    
    // Reset animation
    animationPreviewRef.current.style.animation = 'none'
    animationPreviewRef.current.offsetHeight // Trigger reflow
    animationPreviewRef.current.style.animation = animation.animation
    
    // Stop preview after animation completes
    setTimeout(() => {
      setPreviewingAnimation(null)
    }, 6000)
  }

  // Animation Tab - Comprehensive with preview
  const renderAnimationTab = () => (
    <div className="space-y-4">
      {/* Animation Preview Box */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Animation Preview</label>
          <button
            onClick={() => {
              const currentAnim = getStyleValue('animation')
              if (currentAnim) {
                Object.entries(animationPresets).forEach(([key, anim]) => {
                  if (anim.animation === currentAnim || currentAnim.includes(key)) {
                    previewAnimation(key)
                  }
                })
              }
            }}
            className="text-xs px-2 py-1 bg-[#ff6b35] text-white rounded hover:bg-[#ff8c5a] transition"
          >
            Preview Current
          </button>
        </div>
        <div
          ref={animationPreviewRef}
          className="w-full h-20 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 font-medium border-2 border-gray-200"
          style={{
            animation: getStyleValue('animation') || undefined,
          }}
        >
          {previewingAnimation ? `Previewing: ${animationPresets[previewingAnimation as keyof typeof animationPresets]?.name}` : 'Animation Preview Box'}
        </div>
        <p className="text-xs text-gray-500 mt-2">Select an animation below to see it preview here</p>
      </div>

      {/* Animation Types */}
      <div>
        <SectionHeader
          title="Animation Types"
          isExpanded={expandedSections.animationTypes !== false}
          onToggle={() => toggleSection('animationTypes')}
        />
        {(expandedSections.animationTypes !== false) && (
          <div className="space-y-4 mt-2 pl-2 border-l-2 border-blue-200">
            {/* Entry/Initial Animation */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">1. Select Animation</label>
              <select
                value={(() => {
                  const currentAnim = getStyleValue('animation') || ''
                  // Find which entry animation matches the current one
                  const entryAnims = Object.entries(animationPresets).filter(([key]) => 
                    ['fadeIn', 'fadeInUp', 'fadeInDown', 'fadeInLeft', 'fadeInRight', 
                     'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
                     'zoomIn', 'zoomOut', 'bounceIn', 'bounceInUp', 'bounceInDown',
                     'rotateIn', 'flipInX', 'flipInY', 'float', 'glow', 'gradientShift', 
                     'rotate', 'spin', 'ping', 'scale', 'slide'].includes(key)
                  )
                  const found = entryAnims.find(([key, anim]) => 
                    anim.animation === currentAnim || currentAnim.includes(key)
                  )
                  return found ? found[0] : ''
                })()}
                onChange={(e) => {
                  const selectedKey = e.target.value
                  const hoverAnim = getStyleValue('hoverAnimation') || ''
                  
                  if (selectedKey) {
                    const anim = animationPresets[selectedKey as keyof typeof animationPresets]
                    if (anim) {
                      updateStyle('animation', anim.animation)
                      previewAnimation(selectedKey)
                    }
                  } else {
                    updateStyle('animation', '')
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] hover:border-gray-300 transition-all"
              >
                <option value="">None</option>
                <optgroup label="Entry Animations">
                  {Object.entries(animationPresets).filter(([key]) => 
                    ['fadeIn', 'fadeInUp', 'fadeInDown', 'fadeInLeft', 'fadeInRight', 
                     'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
                     'zoomIn', 'zoomOut', 'bounceIn', 'bounceInUp', 'bounceInDown',
                     'rotateIn', 'flipInX', 'flipInY'].includes(key)
                  ).map(([key, anim]) => (
                    <option key={key} value={key}>{anim.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Advanced Animations">
                  {Object.entries(animationPresets).filter(([key]) => 
                    ['float', 'glow', 'gradientShift', 'rotate', 'spin', 'ping', 'scale', 'slide'].includes(key)
                  ).map(([key, anim]) => (
                    <option key={key} value={key}>{anim.name}{anim.note ? ` (${anim.note})` : ''}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Hover Animation */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">2. Select Hover Animation</label>
              <select
                value={(() => {
                  const currentHoverAnim = getStyleValue('hoverAnimation') || ''
                  // Find which hover animation matches the current one
                  const hoverAnims = Object.entries(animationPresets).filter(([key]) => 
                    ['pulse', 'bounce', 'shake', 'swing', 'wobble', 'rubber', 'flash', 'heartBeat'].includes(key)
                  )
                  const found = hoverAnims.find(([key, anim]) => 
                    anim.animation === currentHoverAnim || currentHoverAnim.includes(key)
                  )
                  return found ? found[0] : ''
                })()}
                onChange={(e) => {
                  const selectedKey = e.target.value
                  if (selectedKey) {
                    const anim = animationPresets[selectedKey as keyof typeof animationPresets]
                    if (anim) {
                      updateStyle('hoverAnimation', anim.animation)
                    }
                  } else {
                    updateStyle('hoverAnimation', '')
                  }
                }}
                className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] hover:border-gray-300 transition-all"
              >
                <option value="">None</option>
                <optgroup label="Hover & Continuous Animations">
                  {Object.entries(animationPresets).filter(([key]) => 
                    ['pulse', 'bounce', 'shake', 'swing', 'wobble', 'rubber', 'flash', 'heartBeat'].includes(key)
                  ).map(([key, anim]) => (
                    <option key={key} value={key}>{anim.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Animation Controls */}
      <div>
        <SectionHeader
          title="Animation Controls"
          isExpanded={expandedSections.animationControls !== false}
          onToggle={() => toggleSection('animationControls')}
        />
        {(expandedSections.animationControls !== false) && (
          <div className="space-y-3 mt-2 pl-2 border-l-2 border-gray-200">
            <InputField
              label="Animation Duration"
              value={(() => {
                const anim = getStyleValue('animation')
                if (!anim) return ''
                const match = anim.match(/(\d+(?:\.\d+)?)s/)
                return match ? match[1] : ''
              })()}
              onChange={(v) => {
                const currentAnim = getStyleValue('animation') || 'fadeIn 0.6s ease'
                const newAnim = currentAnim.replace(/\d+(?:\.\d+)?s/, `${v}s`)
                updateStyle('animation', newAnim)
              }}
              placeholder="0.6"
              type="number"
            />
            <SelectField
              label="Animation Timing"
              value={(() => {
                const anim = getStyleValue('animation')
                if (!anim) return 'ease'
                if (anim.includes('ease-in-out')) return 'ease-in-out'
                if (anim.includes('ease-out')) return 'ease-out'
                if (anim.includes('ease-in')) return 'ease-in'
                if (anim.includes('linear')) return 'linear'
                return 'ease'
              })()}
              onChange={(v) => {
                const currentAnim = getStyleValue('animation') || 'fadeIn 0.6s ease'
                const newAnim = currentAnim.replace(/\b(ease|ease-in|ease-out|ease-in-out|linear)\b/, v)
                updateStyle('animation', newAnim)
              }}
              options={[
                { value: 'ease', label: 'Ease' },
                { value: 'ease-in', label: 'Ease In' },
                { value: 'ease-out', label: 'Ease Out' },
                { value: 'ease-in-out', label: 'Ease In Out' },
                { value: 'linear', label: 'Linear' },
              ]}
            />
            <SelectField
              label="Animation Iteration"
              value={(() => {
                const anim = getStyleValue('animation')
                return anim?.includes('infinite') ? 'infinite' : 'once'
              })()}
              onChange={(v) => {
                const currentAnim = getStyleValue('animation') || ''
                let newAnim = currentAnim.replace(/\s+infinite/g, '')
                if (v === 'infinite') {
                  newAnim += ' infinite'
                }
                updateStyle('animation', newAnim.trim())
              }}
              options={[
                { value: 'once', label: 'Play Once' },
                { value: 'infinite', label: 'Loop Infinite' },
              ]}
            />
            <InputField
              label="Animation Delay"
              value={getStyleValue('animationDelay') || ''}
              onChange={(v) => updateStyle('animationDelay', v)}
              placeholder="0.2s"
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateStyle('animation', '')}
                className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                Remove Animation
              </button>
              <button
                onClick={() => {
                  const currentAnim = getStyleValue('animation')
                  if (currentAnim && animationPreviewRef.current) {
                    previewAnimation(Object.keys(animationPresets).find(key => 
                      animationPresets[key as keyof typeof animationPresets].animation === currentAnim
                    ) || '')
                  }
                }}
                className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
              >
                Preview Again
              </button>
            </div>
          </div>
        )}
      </div>

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
                onFocus={() => { focusedInputRef.current = document.activeElement as HTMLTextAreaElement }}
                onBlur={() => { if (focusedInputRef.current === document.activeElement) focusedInputRef.current = null }}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    const updated = { ...localComponent, style: parsed }
                    setLocalComponent(updated)
                    isInternalUpdateRef.current = true
                    lastUpdateTimeRef.current = Date.now()
                    onUpdate(updated)
                    setTimeout(() => {
                      isInternalUpdateRef.current = false
                    }, 200)
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
            onFocus={() => { focusedInputRef.current = document.activeElement as HTMLTextAreaElement }}
            onBlur={() => { if (focusedInputRef.current === document.activeElement) focusedInputRef.current = null }}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                const updated = { ...localComponent, style: parsed }
                setLocalComponent(updated)
                isInternalUpdateRef.current = true
                lastUpdateTimeRef.current = Date.now()
                onUpdate(updated)
                setTimeout(() => {
                  isInternalUpdateRef.current = false
                }, 200)
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
    <div className="w-80 bg-white h-full flex flex-col shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0 bg-white z-10">
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
      <div className="border-b border-gray-200 flex bg-gray-50 flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'style' && renderStyleTab()}
        {activeTab === 'animation' && renderAnimationTab()}
      </div>
    </div>
  )
}
