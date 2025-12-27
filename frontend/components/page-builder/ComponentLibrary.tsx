'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import {
  FiType,
  FiImage,
  FiMousePointer,
  FiLayers,
  FiBox,
  FiMinimize2,
  FiMinus,
  FiGrid,
  FiVideo,
  FiShoppingCart,
  FiStar,
  FiSearch,
  FiMail,
  FiFilm,
  FiAlertCircle,
  FiShare2,
  FiCode,
  FiMessageCircle,
  FiHelpCircle,
  FiX,
  FiChevronDown,
  FiList,
} from 'react-icons/fi'
import { ComponentType } from './types'

interface ComponentItem {
  type: ComponentType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  category?: string
}

export const availableComponents: ComponentItem[] = [
  // Basic Elements
  { type: 'heading', label: 'Heading', icon: FiType, color: 'text-blue-600', category: 'Basic' },
  { type: 'text', label: 'Text', icon: FiType, color: 'text-gray-600', category: 'Basic' },
  { type: 'button', label: 'Button', icon: FiMousePointer, color: 'text-green-600', category: 'Basic' },
  { type: 'image', label: 'Image', icon: FiImage, color: 'text-purple-600', category: 'Basic' },
  
  // Layout
  { type: 'section', label: 'Section', icon: FiLayers, color: 'text-indigo-600', category: 'Layout' },
  { type: 'container', label: 'Container', icon: FiBox, color: 'text-orange-600', category: 'Layout' },
  { type: 'spacer', label: 'Spacer', icon: FiMinimize2, color: 'text-gray-500', category: 'Layout' },
  { type: 'divider', label: 'Divider', icon: FiMinus, color: 'text-gray-400', category: 'Layout' },
  { type: 'card', label: 'Card', icon: FiBox, color: 'text-cyan-600', category: 'Layout' },
  { type: 'grid', label: 'Grid', icon: FiGrid, color: 'text-pink-600', category: 'Layout' },
  { type: 'column', label: 'Columns', icon: FiLayers, color: 'text-teal-600', category: 'Layout' },
  
  // Media
  { type: 'video', label: 'Video', icon: FiVideo, color: 'text-red-600', category: 'Media' },
  { type: 'slider', label: 'Slider', icon: FiFilm, color: 'text-rose-600', category: 'Media' },
  { type: 'banner', label: 'Banner', icon: FiLayers, color: 'text-indigo-500', category: 'Media' },
  
  // Ecommerce
  { type: 'products-grid', label: 'Products Grid', icon: FiShoppingCart, color: 'text-emerald-600', category: 'Ecommerce' },
  { type: 'featured-products', label: 'Featured Products', icon: FiStar, color: 'text-yellow-600', category: 'Ecommerce' },
  { type: 'product-search', label: 'Product Search', icon: FiSearch, color: 'text-blue-600', category: 'Ecommerce' },
  
  // Forms
  { type: 'contact-form', label: 'Contact Form', icon: FiMail, color: 'text-indigo-600', category: 'Forms' },
  { type: 'newsletter', label: 'Newsletter', icon: FiMail, color: 'text-purple-600', category: 'Forms' },
  { type: 'dropdown', label: 'Dropdown', icon: FiChevronDown, color: 'text-blue-600', category: 'Forms' },
  { type: 'select', label: 'Select', icon: FiList, color: 'text-green-600', category: 'Forms' },
  
  // Content
  { type: 'testimonials', label: 'Testimonials', icon: FiMessageCircle, color: 'text-purple-600', category: 'Content' },
  { type: 'faq', label: 'FAQ', icon: FiHelpCircle, color: 'text-orange-600', category: 'Content' },
  { type: 'code-block', label: 'Code Block', icon: FiCode, color: 'text-gray-700', category: 'Content' },
  { type: 'alert', label: 'Alert', icon: FiAlertCircle, color: 'text-red-500', category: 'Content' },
  { type: 'social-icons', label: 'Social Icons', icon: FiShare2, color: 'text-blue-500', category: 'Content' },
]

const categories = ['All', 'Basic', 'Layout', 'Media', 'Ecommerce', 'Forms', 'Content']

interface ComponentLibraryProps {
  onAddComponent: (type: ComponentType) => void
}

// Draggable Component Item
function DraggableComponentItem({
  component,
  onAddComponent,
}: {
  component: ComponentItem
  onAddComponent: (type: ComponentType) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${component.type}`,
    data: {
      type: 'library-component',
      componentType: component.type,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const Icon = component.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Component Button - Draggable Only */}
      <div
      {...listeners}
      {...attributes}
        className="w-full flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-grab active:cursor-grabbing min-h-[80px] relative select-none"
        title={`Drag ${component.label} to canvas`}
      >
        <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-indigo-100 transition-colors mb-2`}>
          <Icon className={`h-5 w-5 ${component.color}`} />
        </div>
        <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 text-center line-clamp-2">
          {component.label}
        </span>
        <svg className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
    </div>
  )
}

export default function ComponentLibrary({ onAddComponent }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate number of columns based on container width
  const columns = useMemo(() => {
    if (containerWidth === 0) return 2 // Default to 2 columns
    
    // Minimum 2 columns, maximum 4 columns
    // Adjust based on actual container width
    if (containerWidth < 200) return 2      // Very narrow: 2 columns
    if (containerWidth < 280) return 2      // Narrow: 2 columns (minimum)
    if (containerWidth < 360) return 3      // Medium: 3 columns
    return 4                                 // Wide: 4 columns (maximum)
  }, [containerWidth])

  // Observe container width changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim() && selectedCategory === 'All') {
      return availableComponents
    }
    
    const query = searchQuery.toLowerCase().trim()
    return availableComponents.filter((component) => {
      const matchesSearch = !query || 
        component.label.toLowerCase().includes(query) ||
        component.type.toLowerCase().includes(query)
      const matchesCategory = selectedCategory === 'All' || component.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const clearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div 
      ref={containerRef}
      className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col flex-shrink-0"
    >
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0">
        <h2 className="text-white font-bold text-sm">Components</h2>
        <p className="text-indigo-100 text-xs mt-1">Drag to canvas to add</p>
      </div>
        
      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            {filteredComponents.length} {filteredComponents.length === 1 ? 'component' : 'components'} found
          </p>
        )}
        </div>

        {/* Categories */}
      {!searchQuery && (
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {filteredComponents.length > 0 ? (
            <div 
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {filteredComponents.map((component) => (
            <DraggableComponentItem
              key={component.type}
              component={component}
              onAddComponent={onAddComponent}
            />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FiSearch className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-900">No components found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try searching for "{searchQuery}"
              </p>
              <button
                onClick={clearSearch}
                className="mt-4 text-xs text-indigo-600 hover:text-indigo-700"
              >
                Clear search
              </button>
            </div>
        )}
        </div>
      </div>
    </div>
  )
}

