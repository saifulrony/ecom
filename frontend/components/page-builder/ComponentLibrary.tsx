'use client'

import React, { useState, useMemo } from 'react'
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
      {...listeners}
      {...attributes}
      onClick={() => onAddComponent(component.type)}
      className={`flex items-center space-x-3 p-4 sm:p-6 rounded-lg border border-gray-200 bg-white hover:shadow-md hover:border-[#ff6b35] cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${component.color}`} />
      <span className="text-sm sm:text-base font-semibold text-gray-900">{component.label}</span>
    </div>
  )
}

export default function ComponentLibrary({ onAddComponent }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredComponents = useMemo(() => {
    return availableComponents.filter((component) => {
      const matchesSearch = component.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.type.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || component.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col shadow-sm">
      <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Components</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">Add components to your page</p>
        
        {/* Search */}
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors font-medium ${
                selectedCategory === category
                  ? 'bg-[#ff6b35] text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {filteredComponents.length === 0 ? (
          <div className="text-center text-gray-500 py-8 sm:py-12 text-sm sm:text-base">
            <p>No components found</p>
          </div>
        ) : (
          filteredComponents.map((component) => (
            <DraggableComponentItem
              key={component.type}
              component={component}
              onAddComponent={onAddComponent}
            />
          ))
        )}
      </div>
    </div>
  )
}

