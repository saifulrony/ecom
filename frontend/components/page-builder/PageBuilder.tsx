'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ComponentLibrary from './ComponentLibrary'
import ComponentRenderer from './ComponentRenderer'
import PropertiesPanel from './PropertiesPanel'
import { RulerSystem } from './RulerSystem'
import { DropZone } from './DropZone'
import { ContextMenu } from './ContextMenu'
import { Component, ComponentType } from './types'
import GridComponent from './GridComponent'
import ColumnComponent from './ColumnComponent'
import {
  FiSave,
  FiEye,
  FiX,
  FiTrash2,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiDownload,
  FiUpload,
  FiMaximize2,
  FiMinimize2,
  FiZoomIn,
  FiZoomOut,
  FiMinus,
  FiGrid,
  FiPlus,
  FiEdit2,
  FiMove,
} from 'react-icons/fi'
import { availableComponents } from './ComponentLibrary'
import { adminAPI } from '@/lib/api'

interface PageBuilderProps {
  initialComponents?: Component[]
  pageId?: string
  pageTitle?: string
  pageDescription?: string
  onSave?: (components: Component[]) => void
  onClose?: () => void
}

const generateId = () => `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const getDefaultComponent = (type: ComponentType): Component => {
  const defaults: Record<ComponentType, Partial<Component>> = {
    heading: {
      props: { text: 'Heading Text', level: 'h1', align: 'left', color: '#000000', fontSize: '2.5rem', background: '#ffffff' },
      content: 'Heading Text',
      style: { color: '#000000', backgroundColor: '#ffffff' },
    },
    text: {
      props: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', align: 'left', color: '#333333' },
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    button: {
      props: { text: 'Click Me', link: '#', variant: 'primary', size: 'md', align: 'left' },
      content: 'Click Me',
    },
    image: {
      props: { src: '', alt: 'Image', width: '100%', height: 'auto' },
    },
    section: {
      props: { padding: '40px', background: '#ffffff', align: 'center' },
      children: [],
    },
    container: {
      props: { columns: 2, gap: '20px', padding: '20px' },
      children: [],
    },
    spacer: {
      props: { height: '40px' },
    },
    divider: {
      props: { color: '#e5e7eb', thickness: '1px', style: 'solid' },
    },
    card: {
      props: { title: 'Card Title', content: 'Card content goes here', padding: '20px' },
      children: [],
    },
    grid: {
      props: { columns: 3, rows: 3, gap: '20px', template: 'custom' },
      children: [],
    },
    video: {
      props: { src: '', width: '100%', height: '400px', autoplay: false },
    },
    form: {
      props: { fields: [] },
    },
    'products-grid': {
      props: { 
        limit: 12, 
        columns: 4,
        showCategory: true,
        showWishlist: true,
        showCartButton: true,
        showViewDetails: false,
        hideStockOut: false,
      },
    },
    'featured-products': {
      props: { 
        limit: 6, 
        columns: 3,
        showCategory: true,
        showWishlist: true,
        showCartButton: true,
        showViewDetails: false,
        hideStockOut: false,
      },
    },
    'product-search': {
      props: { placeholder: 'Search products...' },
    },
    'contact-form': {
      props: { title: 'Contact Us', fields: ['name', 'email', 'message'] },
    },
    newsletter: {
      props: { title: 'Subscribe to Newsletter', placeholder: 'Enter your email' },
    },
    dropdown: {
      props: { 
        label: 'Select Option', 
        placeholder: 'Choose an option',
        options: ['Option 1', 'Option 2', 'Option 3'],
        value: '',
        required: false,
      },
    },
    select: {
      props: { 
        name: 'select',
        id: 'select',
        label: 'Select', 
        options: ['Option 1', 'Option 2', 'Option 3'],
        value: '',
        required: false,
        multiple: false,
      },
    },
    slider: {
      props: { autoplay: true, speed: 5000, showArrows: true, showDots: true },
      children: [
        {
          id: generateId(),
          type: 'banner',
          props: {
            title: 'Welcome to Our Store',
            subtitle: 'Discover amazing products at unbeatable prices',
            height: '500px',
            gradient: 'gradient-orange',
          },
        },
        {
          id: generateId(),
          type: 'banner',
          props: {
            title: 'New Collection',
            subtitle: 'Shop the latest trends and styles',
            height: '500px',
            gradient: 'gradient-primary',
          },
        },
        {
          id: generateId(),
          type: 'banner',
          props: {
            title: 'Special Offers',
            subtitle: 'Limited time deals you don\'t want to miss',
            height: '500px',
            gradient: 'gradient-warm',
          },
        },
      ],
    },
    banner: {
      props: { title: 'Banner Title', subtitle: 'Banner subtitle', image: '', height: '400px' },
    },
    testimonials: {
      props: { items: [] },
    },
    faq: {
      props: { items: [] },
    },
    'code-block': {
      props: { code: '', language: 'javascript' },
    },
    alert: {
      props: { text: 'Alert message', type: 'info', dismissible: true },
    },
    'social-icons': {
      props: { platforms: ['facebook', 'twitter', 'instagram'], size: 'md' },
    },
  }

  return {
    id: generateId(),
    type,
    props: defaults[type]?.props || {},
    content: defaults[type]?.content || '',
    children: defaults[type]?.children || [],
    style: {},
  }
}

export default function PageBuilder({
  initialComponents = [],
  pageId,
  pageTitle: initialTitle = 'Untitled Page',
  pageDescription: initialDescription = '',
  onSave,
  onClose,
}: PageBuilderProps) {
  const [components, setComponents] = useState<Component[]>(initialComponents)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [history, setHistory] = useState<Component[][]>([initialComponents])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState(false)
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [pageTitle, setPageTitle] = useState(initialTitle)
  const [pageDescription, setPageDescription] = useState(initialDescription)
  const [saving, setSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newPageId, setNewPageId] = useState(pageId || '')
  const [newPageTitle, setNewPageTitle] = useState(initialTitle)
  const [newPageDescription, setNewPageDescription] = useState(initialDescription)
  const [zoom, setZoom] = useState(1)
  const [showRulers, setShowRulers] = useState(true)
  const [showGuides, setShowGuides] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; componentId: string } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const addToHistory = useCallback((newComponents: Component[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newComponents)
      return newHistory.slice(-50) // Keep last 50 states
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 49))
  }, [historyIndex])

  const handleAddComponent = useCallback((type: ComponentType) => {
    const newComponent = getDefaultComponent(type)
    const newComponents = [...components, newComponent]
    setComponents(newComponents)
    addToHistory(newComponents)
    setSelectedComponentId(newComponent.id)
  }, [components, addToHistory])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dragging from library
    if (active.id.toString().startsWith('library-')) {
      const componentType = active.data.current?.componentType as ComponentType
      if (componentType) {
      const newComponent = getDefaultComponent(componentType)
        
        // Check if dropping on a drop zone - insert at that position
        if (over.id.toString().startsWith('drop-zone-')) {
          const dropIndex = parseInt(over.id.toString().replace('drop-zone-', ''))
          const newComponents = [
            ...components.slice(0, dropIndex),
            newComponent,
            ...components.slice(dropIndex),
          ]
          setComponents(newComponents)
          addToHistory(newComponents)
          setSelectedComponentId(newComponent.id)
        } else if (over.id.toString().startsWith('component-')) {
          // Drop on existing component - insert after it
          const targetId = over.id.toString().replace('component-', '')
          const targetIndex = components.findIndex((c) => c.id === targetId)
          if (targetIndex !== -1) {
            const newComponents = [
              ...components.slice(0, targetIndex + 1),
              newComponent,
              ...components.slice(targetIndex + 1),
            ]
            setComponents(newComponents)
            addToHistory(newComponents)
            setSelectedComponentId(newComponent.id)
          }
        } else {
          // Drop on canvas - add to end
      const newComponents = [...components, newComponent]
      setComponents(newComponents)
      addToHistory(newComponents)
      setSelectedComponentId(newComponent.id)
        }
      }
    } else {
      // Reorder existing components
      if (over.id.toString().startsWith('drop-zone-')) {
        const dropIndex = parseInt(over.id.toString().replace('drop-zone-', ''))
        const oldIndex = components.findIndex((c) => c.id === activeId)
        if (oldIndex !== -1) {
          const item = components[oldIndex]
          const newItems = components.filter((_, index) => index !== oldIndex)
          const adjustedIndex = oldIndex < dropIndex ? dropIndex - 1 : dropIndex
          newItems.splice(adjustedIndex, 0, item)
          setComponents(newItems)
          addToHistory(newItems)
        }
      } else if (over.id.toString().startsWith('component-')) {
        // Drop on existing component - swap positions
        const targetId = over.id.toString().replace('component-', '')
        const oldIndex = components.findIndex((c) => c.id === activeId)
        const targetIndex = components.findIndex((c) => c.id === targetId)
        
        if (oldIndex !== -1 && targetIndex !== -1 && oldIndex !== targetIndex) {
          const newComponents = arrayMove(components, oldIndex, targetIndex)
          setComponents(newComponents)
          addToHistory(newComponents)
        }
      } else {
        // Fallback: try to find by direct ID match
      const oldIndex = components.findIndex((c) => c.id === activeId)
      const newIndex = components.findIndex((c) => c.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newComponents = arrayMove(components, oldIndex, newIndex)
        setComponents(newComponents)
        addToHistory(newComponents)
        }
      }
    }

    setActiveId(null)
  }

  const handleUpdateComponent = useCallback((updatedComponent: Component) => {
    const updateComponent = (comps: Component[]): Component[] => {
      return comps.map((comp) => {
        if (comp.id === updatedComponent.id) {
          return updatedComponent
        }
        if (comp.children) {
          return { ...comp, children: updateComponent(comp.children) }
        }
        return comp
      })
    }

    const newComponents = updateComponent(components)
    setComponents(newComponents)
    addToHistory(newComponents)
  }, [components, addToHistory])

  const handleDeleteComponent = useCallback((id: string) => {
    const deleteComponent = (comps: Component[]): Component[] => {
      return comps
        .filter((comp) => comp.id !== id)
        .map((comp) => {
          if (comp.children) {
            return { ...comp, children: deleteComponent(comp.children) }
          }
          return comp
        })
    }

    const newComponents = deleteComponent(components)
    setComponents(newComponents)
    addToHistory(newComponents)
    if (selectedComponentId === id) {
      setSelectedComponentId(null)
    }
  }, [components, selectedComponentId, addToHistory])

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setComponents(history[newIndex])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setComponents(history[newIndex])
    }
  }

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent, componentId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, componentId })
  }

  const handleDuplicate = (id: string) => {
    const component = components.find((c) => c.id === id)
    if (component) {
      const duplicated = {
        ...component,
        id: generateId(),
      }
      const index = components.findIndex((c) => c.id === id)
      const newComponents = [...components]
      newComponents.splice(index + 1, 0, duplicated)
      setComponents(newComponents)
      addToHistory(newComponents)
      setSelectedComponentId(duplicated.id)
    }
    setContextMenu(null)
  }

  const handleCopy = (id: string) => {
    const component = components.find((c) => c.id === id)
    if (component) {
      navigator.clipboard.writeText(JSON.stringify(component))
    }
    setContextMenu(null)
  }

  const handleMoveUp = (id: string) => {
    const index = components.findIndex((c) => c.id === id)
    if (index > 0) {
      const newComponents = arrayMove(components, index, index - 1)
      setComponents(newComponents)
      addToHistory(newComponents)
    }
    setContextMenu(null)
  }

  const handleMoveDown = (id: string) => {
    const index = components.findIndex((c) => c.id === id)
    if (index < components.length - 1) {
      const newComponents = arrayMove(components, index, index + 1)
      setComponents(newComponents)
      addToHistory(newComponents)
    }
    setContextMenu(null)
  }

  // Zoom Controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.25))
  const handleZoomFit = () => setZoom(1)
  const handleZoomReset = () => setZoom(1)

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleSave = async () => {
    if (!newPageId.trim()) {
      alert('Please enter a Page ID')
      return
    }

    setSaving(true)
    try {
      if (pageId) {
        // Try to update existing page
        try {
          await adminAPI.updatePage(pageId, {
            page_id: newPageId,
            title: newPageTitle,
            description: newPageDescription,
            components,
            is_published: true,
          })
          alert('Page updated successfully!')
        } catch (updateError: any) {
          // If update fails with 404, create the page instead
          if (updateError.response?.status === 404) {
            try {
              await adminAPI.createPage({
                page_id: newPageId || pageId,
                title: newPageTitle,
                description: newPageDescription,
                components,
                is_published: true,
              })
              alert('Page created successfully!')
            } catch (createError: any) {
              // If create fails (maybe page already exists), try update with new page_id
              if (createError.response?.status === 409) {
                await adminAPI.updatePage(newPageId || pageId, {
                  page_id: newPageId,
                  title: newPageTitle,
                  description: newPageDescription,
                  components,
                  is_published: true,
                })
                alert('Page updated successfully!')
              } else {
                throw createError
              }
            }
          } else {
            throw updateError
          }
        }
      } else {
        // Create new page
        await adminAPI.createPage({
          page_id: newPageId,
          title: newPageTitle,
          description: newPageDescription,
          components,
          is_published: true,
        })
        alert('Page saved successfully!')
      }
      setShowSaveModal(false)
      if (onSave) onSave(components)
    } catch (error: any) {
      console.error('Save error:', error.response?.status, error.response?.data)
      alert(error.response?.data?.error || 'Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const data = {
      page_id: newPageId || 'exported-page',
      title: newPageTitle,
      description: newPageDescription,
      components,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${newPageId || 'page'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string)
            if (data.components) {
              setComponents(data.components)
              setNewPageTitle(data.title || 'Imported Page')
              setNewPageDescription(data.description || '')
              setNewPageId(data.page_id || '')
              setHistory([data.components])
              setHistoryIndex(0)
            }
          } catch (error) {
            alert('Failed to import page. Invalid JSON file.')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const selectedComponent = components.find((c) => c.id === selectedComponentId) || null

  const getCanvasWidth = () => {
    switch (deviceView) {
      case 'tablet':
        return 768
      case 'mobile':
        return 375
      default:
        return 1200
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Page Builder</h1>
            <div className="h-6 w-px bg-gray-300" />
            <span className="text-sm text-gray-500">Build and customize your pages</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Undo"
            >
              <FiCornerUpLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Redo"
            >
              <FiCornerUpRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-2 rounded transition-colors ${
                deviceView === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Desktop View"
            >
              <FiMaximize2 className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setDeviceView('tablet')}
              className={`p-2 rounded transition-colors ${
                deviceView === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Tablet View"
            >
              <FiMinimize2 className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-2 rounded transition-colors ${
                deviceView === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Mobile View"
            >
              <FiMinimize2 className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRulers(!showRulers)}
              className={`px-3 py-2 rounded transition-colors flex items-center space-x-1 ${
                showRulers 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={showRulers ? "Hide Rulers" : "Show Rulers"}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-medium">{showRulers ? 'Rulers On' : 'Rulers Off'}</span>
            </button>
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`p-2 rounded transition-colors ${
                showGuides 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={showGuides ? "Hide Alignment Guides" : "Show Alignment Guides"}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded transition-colors ${
                snapToGrid 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={snapToGrid ? "Disable Grid" : "Enable Grid"}
            >
              <FiGrid className="h-5 w-5" />
            </button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded transition-colors hover:bg-gray-200 text-gray-600"
              title="Zoom Out"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded transition-colors hover:bg-gray-200 text-gray-600"
              title="Zoom In"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
              className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
              <FiEye className="h-4 w-4" />
            <span>{previewMode ? 'Edit' : 'Preview'}</span>
          </button>
          <button
            onClick={handleExport}
              className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
              <FiDownload className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleImport}
              className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
              <FiUpload className="h-4 w-4" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
              <FiSave className="h-4 w-4" />
            <span>Save Page</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
                title="Close"
            >
                <FiX className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
      </header>

      {/* Main Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden relative">
        {/* Component Library */}
          {!previewMode && (
            <div className="bg-white border-r border-gray-200 flex-shrink-0 relative z-10">
              <ComponentLibrary onAddComponent={handleAddComponent} />
            </div>
          )}

        {/* Canvas */}
          <div 
            ref={canvasRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 relative flex items-start justify-center"
            style={{ 
              minHeight: 0,
              padding: '16px',
              height: 'auto',
            }}
          >
            {/* Ruler System */}
            {showRulers && !previewMode && (
              <RulerSystem
                canvasRef={canvasRef}
                zoom={zoom}
                showRulers={showRulers}
                showGuides={showGuides}
                snapToGrid={snapToGrid}
                gridSize={10}
              />
            )}
            <div
              className="bg-white shadow-lg transition-all duration-300 relative flex flex-col"
              style={{
                width: getCanvasWidth(),
                minHeight: 'calc(100vh - 180px)',
                height: 'auto',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                marginTop: showRulers ? '20px' : '0',
                marginLeft: showRulers ? '20px' : '0',
                flexShrink: 0,
                maxWidth: '100%',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <SortableContext items={components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0 flex-1 p-8">
                  {components.length === 0 ? (
                    <div className="relative">
                      <DropZone id="drop-zone-0" index={0} />
                      <div className="flex flex-col items-center justify-center h-96 text-gray-400 pointer-events-none absolute inset-0">
                        <FiPlus className="h-16 w-16 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Start building your page</p>
                        <p className="text-sm">Drag components from the left panel or click to add</p>
                        {pageId === 'home' && (
                          <p className="text-xs text-gray-300 mt-2">Tip: This is your home page. Add components to customize it!</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Drop zone at the beginning */}
                      <DropZone id="drop-zone-0" index={0} />
                      {components.map((component, index) => (
                      <React.Fragment key={component.id}>
                          <div data-component-id={component.id} data-selected={selectedComponentId === component.id ? 'true' : 'false'}>
                        <SortableComponent
                          component={component}
                          isSelected={selectedComponentId === component.id}
                          isHovered={hoveredComponentId === component.id}
                          onClick={() => setSelectedComponentId(component.id)}
                          onMouseEnter={() => setHoveredComponentId(component.id)}
                          onMouseLeave={() => setHoveredComponentId(null)}
                          onContextMenu={(e) => handleContextMenu(e, component.id)}
                          onUpdate={handleUpdateComponent}
                          onDelete={handleDeleteComponent}
                          previewMode={previewMode}
                        />
                          </div>
                          {/* Drop zone after each component */}
                          <DropZone id={`drop-zone-${index + 1}`} index={index + 1} />
                      </React.Fragment>
                      ))}
                    </>
                  )}
                </div>
              </SortableContext>
            </div>
          </div>

          {/* Properties Panel */}
          {!previewMode && (
            <div className="bg-white border-l border-gray-200 flex-shrink-0 relative z-10 h-full overflow-hidden flex flex-col">
              <PropertiesPanel
                component={selectedComponent || null}
                onUpdate={handleUpdateComponent}
                onDelete={handleDeleteComponent}
              />
            </div>
          )}
        </div>

              <DragOverlay>
                {activeId ? (
            activeId.toString().startsWith('library-') ? (
              (() => {
                const componentType = activeId.toString().replace('library-', '') as ComponentType;
                const componentInfo = availableComponents.find(c => c.type === componentType);
                if (!componentInfo) return null;
                const Icon = componentInfo.icon;
                return (
                  <div className="bg-white border-2 border-indigo-500 rounded-lg shadow-lg flex flex-col items-center justify-center p-3 min-w-[120px] min-h-[100px]">
                    <div className="p-2 rounded-lg bg-indigo-50 mb-2">
                      <Icon className={`h-6 w-6 ${componentInfo.color}`} />
                  </div>
                    <span className="text-sm font-medium text-gray-700 text-center">
                      {componentInfo.label}
                    </span>
                  </div>
                );
              })()
            ) : null
                ) : null}
              </DragOverlay>
            </DndContext>

          {/* Context Menu */}
          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onEdit={() => {
                setSelectedComponentId(contextMenu.componentId)
                setContextMenu(null)
              }}
              onDelete={() => handleDeleteComponent(contextMenu.componentId)}
              onDuplicate={() => handleDuplicate(contextMenu.componentId)}
              onCopy={() => handleCopy(contextMenu.componentId)}
              onMoveUp={() => handleMoveUp(contextMenu.componentId)}
              onMoveDown={() => handleMoveDown(contextMenu.componentId)}
              canMoveUp={components.findIndex((c) => c.id === contextMenu.componentId) > 0}
              canMoveDown={components.findIndex((c) => c.id === contextMenu.componentId) < components.length - 1}
            />
          )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Save Page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page ID (URL slug)</label>
                <input
                  type="text"
                  value={newPageId}
                  onChange={(e) => setNewPageId(e.target.value)}
                  placeholder="e.g., landing-page"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Used in URL: /pages/{newPageId || 'page-id'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Title</label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="Page Title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={newPageDescription}
                  onChange={(e) => setNewPageDescription(e.target.value)}
                  placeholder="Page description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !newPageId.trim()}
                className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sortable Component Wrapper
function SortableComponent({
  component,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onUpdate,
  onDelete,
  previewMode,
}: {
  component: Component
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  onUpdate: (component: Component) => void
  onDelete: (id: string) => void
  previewMode: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: component.id,
  })
  
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `component-${component.id}`,
  })
  
  const componentRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const resizeDirection = useRef<string | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startWidth = useRef(0)
  const startHeight = useRef(0)
  const startLeft = useRef(0)
  const startTop = useRef(0)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing.current ? 'none' : transition,
  }

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    if (previewMode) return
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    isResizing.current = true
    resizeDirection.current = direction
    const rect = componentRef.current?.getBoundingClientRect()
    if (rect && componentRef.current) {
      startX.current = e.clientX
      startY.current = e.clientY
      startWidth.current = rect.width
      startHeight.current = rect.height
      // Get current left/top position (either from style or computed)
      const computedStyle = window.getComputedStyle(componentRef.current)
      startLeft.current = parseFloat(computedStyle.left) || 0
      startTop.current = parseFloat(computedStyle.top) || 0
    }
    document.addEventListener('mousemove', handleResize, { passive: false })
    document.addEventListener('mouseup', handleResizeEnd)
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current || !componentRef.current || !resizeDirection.current) return
    e.preventDefault()
    e.stopPropagation()
    
    const deltaX = e.clientX - startX.current
    const deltaY = e.clientY - startY.current
    const direction = resizeDirection.current
    
    let newWidth = startWidth.current
    let newHeight = startHeight.current
    let newLeft = startLeft.current
    let newTop = startTop.current

    if (direction.includes('right')) {
      newWidth = startWidth.current + deltaX
    }
    if (direction.includes('left')) {
      newWidth = startWidth.current - deltaX
      newLeft = startLeft.current + deltaX
    }
    if (direction.includes('bottom')) {
      newHeight = startHeight.current + deltaY
    }
    if (direction.includes('top')) {
      newHeight = startHeight.current - deltaY
      newTop = startTop.current + deltaY
    }

    // Apply min constraints
    newWidth = Math.max(50, newWidth)
    newHeight = Math.max(50, newHeight)

    // Apply styles directly to DOM for visual feedback during drag (no state update)
    if (componentRef.current) {
      componentRef.current.style.width = `${newWidth}px`
      if (newHeight > 50) {
        componentRef.current.style.height = `${newHeight}px`
      }
      if (direction.includes('left')) {
        componentRef.current.style.left = `${newLeft}px`
        componentRef.current.style.position = 'relative'
      }
      if (direction.includes('top')) {
        componentRef.current.style.top = `${newTop}px`
        componentRef.current.style.position = 'relative'
      }
      componentRef.current.style.transition = 'none'
    }
  }

  const handleResizeEnd = () => {
    // Update component state only on mouse release (drag and release)
    if (componentRef.current) {
      const finalWidth = componentRef.current.offsetWidth
      const finalHeight = componentRef.current.offsetHeight
      const computedStyle = window.getComputedStyle(componentRef.current)
      const finalLeft = parseFloat(computedStyle.left) || 0
      const finalTop = parseFloat(computedStyle.top) || 0
        
        // Clean up inline styles
      componentRef.current.style.transition = ''
      componentRef.current.style.width = ''
      componentRef.current.style.height = ''
      componentRef.current.style.left = ''
      componentRef.current.style.top = ''
      componentRef.current.style.position = ''
        
        // Update component state with final dimensions
        const currentStyle = component.style || {}
        const updatedComponent = {
          ...component,
          style: {
            ...currentStyle,
            width: `${finalWidth}px`,
          ...(finalHeight > 50 ? { height: `${finalHeight}px` } : {}),
          ...(resizeDirection.current?.includes('left') && finalLeft !== 0 ? { left: `${finalLeft}px` } : {}),
          ...(resizeDirection.current?.includes('top') && finalTop !== 0 ? { top: `${finalTop}px` } : {}),
          },
        }
        onUpdate(updatedComponent)
    }
    
    isResizing.current = false
    resizeDirection.current = null
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [])

  // Combine refs for both sortable and droppable
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    setDroppableRef(node)
  }

  const ResizeHandle = ({ position }: { position: string }) => (
    <div
      onMouseDown={(e) => handleResizeStart(e, position)}
      className={`absolute bg-[#ff6b35] border-2 border-white shadow-md z-50 ${
        position.includes('top') && position.includes('left') ? 'top-0 left-0 w-4 h-4 cursor-nwse-resize -translate-x-1.5 -translate-y-1.5 rounded-sm' :
        position.includes('top') && position.includes('right') ? 'top-0 right-0 w-4 h-4 cursor-nesw-resize translate-x-1.5 -translate-y-1.5 rounded-sm' :
        position.includes('bottom') && position.includes('left') ? 'bottom-0 left-0 w-4 h-4 cursor-nesw-resize -translate-x-1.5 translate-y-1.5 rounded-sm' :
        position.includes('bottom') && position.includes('right') ? 'bottom-0 right-0 w-4 h-4 cursor-nwse-resize translate-x-1.5 translate-y-1.5 rounded-sm' :
        position === 'top' ? 'top-0 left-1/2 -translate-x-1/2 w-20 h-2 cursor-ns-resize -translate-y-1 rounded' :
        position === 'bottom' ? 'bottom-0 left-1/2 -translate-x-1/2 w-20 h-2 cursor-ns-resize translate-y-1 rounded' :
        position === 'left' ? 'left-0 top-1/2 -translate-y-1/2 w-2 h-20 cursor-ew-resize -translate-x-1 rounded' :
        position === 'right' ? 'right-0 top-1/2 -translate-y-1/2 w-2 h-20 cursor-ew-resize translate-x-1 rounded' :
        ''
      } hover:bg-[#ff8c5a] hover:scale-110 transition-all`}
      style={{ touchAction: 'none' }}
    />
  )

  return (
      <div
        ref={combinedRef}
        {...attributes}
        className={`relative mb-2 ${previewMode ? '' : 'group'} ${isOver ? 'bg-red-50/50' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onContextMenu={onContextMenu}
        data-component-id={component.id}
        data-selected={isSelected}
        style={{
          ...style,
          boxShadow: isOver ? '0 0 0 4px rgba(239, 68, 68, 0.5)' : 'none',
        }}
      >
      {!previewMode && (
        <div
          className={`absolute -left-8 top-0 h-full w-1 ${
            isSelected ? 'bg-[#ff6b35]' : isHovered ? 'bg-blue-400' : 'bg-transparent'
          } transition-colors`}
        />
      )}
      <div
        ref={componentRef}
        className={`relative ${previewMode ? '' : 'cursor-pointer'} ${
          isSelected && !previewMode ? 'ring-2 ring-[#ff6b35] ring-offset-2' : ''
        } ${isHovered && !previewMode ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
        onClick={onClick}
        style={{
          ...(component.style?.width ? { width: component.style.width } : {}),
          ...(component.style?.height ? { height: component.style.height } : {}),
          ...(component.style?.left ? { left: component.style.left, position: 'relative' } : {}),
          ...(component.style?.top ? { top: component.style.top, position: 'relative' } : {}),
          ...(isResizing.current ? { transition: 'none' } : {}),
        }}
      >
        {component.type === 'grid' ? (
          <GridComponent
            component={component}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onDeleteCell={(cellId) => {
              if (component.children) {
                const updatedChildren = component.children.filter(c => c.id !== cellId)
                onUpdate({
                  ...component,
                  children: updatedChildren,
                })
              }
            }}
            previewMode={previewMode}
          />
        ) : (
          <ComponentRenderer
            component={component}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onUpdate={onUpdate}
            onDelete={onDelete}
            previewMode={previewMode}
          />
        )}
        {!previewMode && isSelected && (
          <>
            <ResizeHandle position="top-left" />
            <ResizeHandle position="top-right" />
            <ResizeHandle position="bottom-left" />
            <ResizeHandle position="bottom-right" />
            <ResizeHandle position="top" />
            <ResizeHandle position="bottom" />
            <ResizeHandle position="left" />
            <ResizeHandle position="right" />
          </>
        )}
      </div>
      {/* Top Center Toolbar - Edit, Move, Delete */}
      {!previewMode && (isSelected || isHovered) && (
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-white border border-gray-300 rounded-lg shadow-lg p-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors cursor-grab active:cursor-grabbing"
            title="Move"
          >
            <FiMove className="w-4 h-4" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(component.id)
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

