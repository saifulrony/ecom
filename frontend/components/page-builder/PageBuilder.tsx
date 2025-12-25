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
} from 'react-icons/fi'
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
      props: { text: 'Heading Text', level: 'h1', align: 'left', color: '#000000', fontSize: '2.5rem' },
      content: 'Heading Text',
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
      props: { columns: 3, gap: '20px' },
      children: [],
    },
    video: {
      props: { src: '', width: '100%', height: '400px', autoplay: false },
    },
    form: {
      props: { fields: [] },
    },
    'products-grid': {
      props: { limit: 12, columns: 4 },
    },
    'featured-products': {
      props: { limit: 6, columns: 3 },
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
    slider: {
      props: { autoplay: true, speed: 5000, showArrows: true, showDots: true },
      children: [],
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

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dragging from library
    if (active.data.current?.type === 'library-component') {
      const componentType = active.data.current.componentType as ComponentType
      const newComponent = getDefaultComponent(componentType)
      const newComponents = [...components, newComponent]
      setComponents(newComponents)
      addToHistory(newComponents)
      setSelectedComponentId(newComponent.id)
    } else {
      // Reorder existing components
      const oldIndex = components.findIndex((c) => c.id === activeId)
      const newIndex = components.findIndex((c) => c.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newComponents = arrayMove(components, oldIndex, newIndex)
        setComponents(newComponents)
        addToHistory(newComponents)
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
        // Update existing page
        await adminAPI.updatePage(pageId, {
          page_id: newPageId,
          title: newPageTitle,
          description: newPageDescription,
          components,
        })
        alert('Page updated successfully!')
      } else {
        // Create new page
        await adminAPI.createPage({
          page_id: newPageId,
          title: newPageTitle,
          description: newPageDescription,
          components,
          is_published: false,
        })
        alert('Page saved successfully!')
      }
      setShowSaveModal(false)
      if (onSave) onSave(components)
    } catch (error: any) {
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
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold text-gray-900">Page Builder</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <FiCornerUpLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <FiCornerUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-gray-100"
              title="Zoom Out"
            >
              <FiZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-gray-100"
              title="Zoom In"
            >
              <FiZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1.5 rounded hover:bg-gray-100"
              title="Reset Zoom"
            >
              <FiMinus className="w-4 h-4" />
            </button>
          </div>

          {/* Ruler & Grid Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRulers(!showRulers)}
              className={`p-2 rounded ${showRulers ? 'bg-[#ff6b35] text-white' : 'hover:bg-gray-100'}`}
              title="Toggle Rulers"
            >
              <FiMaximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded ${snapToGrid ? 'bg-[#ff6b35] text-white' : 'hover:bg-gray-100'}`}
              title="Snap to Grid"
            >
              <FiGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Device View Toggle */}
          <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 rounded ${deviceView === 'desktop' ? 'bg-[#ff6b35] text-white' : 'text-gray-600'}`}
              title="Desktop"
            >
              <FiMaximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceView('tablet')}
              className={`p-1.5 rounded ${deviceView === 'tablet' ? 'bg-[#ff6b35] text-white' : 'text-gray-600'}`}
              title="Tablet"
            >
              <FiMinimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded ${deviceView === 'mobile' ? 'bg-[#ff6b35] text-white' : 'text-gray-600'}`}
              title="Mobile"
            >
              <FiMinimize2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <FiEye className="w-4 h-4" />
            <span>{previewMode ? 'Edit' : 'Preview'}</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <FiDownload className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={handleImport}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <FiUpload className="w-4 h-4" />
            <span>Import</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] flex items-center space-x-2"
          >
            <FiSave className="w-4 h-4" />
            <span>Save Page</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Component Library */}
        {!previewMode && <ComponentLibrary onAddComponent={handleAddComponent} />}

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-200 p-8 relative" ref={canvasRef}>
          <div 
            className="mx-auto bg-white shadow-lg relative" 
            style={{ 
              width: getCanvasWidth(), 
              minHeight: '100vh',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
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

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="p-8" style={{ marginTop: showRulers ? '20px' : '0', marginLeft: showRulers ? '20px' : '0' }}>
                  {components.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <p className="text-lg mb-2">Start building your page</p>
                      <p className="text-sm">Drag components from the left sidebar or click to add</p>
                    </div>
                  ) : (
                    components.map((component, index) => (
                      <React.Fragment key={component.id}>
                        <DropZone id={`drop-${index}`} index={index} />
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
                      </React.Fragment>
                    ))
                  )}
                  {components.length > 0 && <DropZone id={`drop-${components.length}`} index={components.length} />}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId ? (
                  <div className="bg-white border-2 border-[#ff6b35] rounded-lg p-4 shadow-lg">
                    Dragging...
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

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
        </div>

        {/* Properties Panel */}
        {!previewMode && selectedComponent && (
          <PropertiesPanel
            component={selectedComponent}
            onUpdate={handleUpdateComponent}
            onDelete={handleDeleteComponent}
          />
        )}
      </div>

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
  const componentRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const resizeDirection = useRef<string | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startWidth = useRef(0)
  const startHeight = useRef(0)

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
    if (rect) {
      startX.current = e.clientX
      startY.current = e.clientY
      startWidth.current = rect.width
      startHeight.current = rect.height
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

    if (direction.includes('right')) {
      newWidth = startWidth.current + deltaX
    }
    if (direction.includes('left')) {
      newWidth = startWidth.current - deltaX
    }
    if (direction.includes('bottom')) {
      newHeight = startHeight.current + deltaY
    }
    if (direction.includes('top')) {
      newHeight = startHeight.current - deltaY
    }

    // Apply min constraints
    newWidth = Math.max(50, newWidth)
    newHeight = Math.max(50, newHeight)

    // Apply styles directly to DOM for visual feedback during drag (no state update)
    const renderElement = componentRef.current?.querySelector('[data-component-content]') as HTMLElement
    if (renderElement) {
      renderElement.style.width = `${newWidth}px`
      renderElement.style.height = `${newHeight}px`
      renderElement.style.transition = 'none'
    }
  }

  const handleResizeEnd = () => {
    // Update component state only on mouse release (drag and release)
    if (componentRef.current) {
      const renderElement = componentRef.current.querySelector('[data-component-content]') as HTMLElement
      if (renderElement) {
        const finalWidth = renderElement.offsetWidth
        const finalHeight = renderElement.offsetHeight
        
        // Clean up inline styles
        renderElement.style.transition = ''
        renderElement.style.width = ''
        renderElement.style.height = ''
        
        // Update component state with final dimensions
        const currentStyle = component.style || {}
        const updatedComponent = {
          ...component,
          style: {
            ...currentStyle,
            width: `${finalWidth}px`,
            height: `${finalHeight}px`,
          },
        }
        onUpdate(updatedComponent)
      }
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
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`relative mb-2 ${previewMode ? '' : 'group'}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onContextMenu={onContextMenu}
        data-component-id={component.id}
        data-selected={isSelected}
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
        style={isResizing.current ? { transition: 'none' } : {}}
      >
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
      {!previewMode && isSelected && (
        <div className="absolute -top-8 right-0 flex items-center space-x-2 bg-white border border-gray-300 rounded-lg shadow-lg p-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(component.id)
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

