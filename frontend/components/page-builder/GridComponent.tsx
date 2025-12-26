'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Component, ComponentType } from './types'
import { FiX, FiMaximize2, FiMinimize2, FiCornerDownRight, FiPlus } from 'react-icons/fi'
import { useDroppable } from '@dnd-kit/core'
import ComponentRenderer from './ComponentRenderer'

interface GridComponentProps {
  component: Component
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onUpdate?: (component: Component) => void
  onDelete?: (id: string) => void
  onDeleteCell?: (cellId: string) => void
  onAddToCell?: (cellId: string, newComponent: Component) => void
  previewMode?: boolean
}

// Grid Templates with different shapes
export const gridTemplates = {
  '2x2': { columns: 2, rows: 2, cells: 4, shape: 'card' },
  '3x3': { columns: 3, rows: 3, cells: 9, shape: 'rounded' },
  '4x4': { columns: 4, rows: 4, cells: 16, shape: 'modern' },
  '2x3': { columns: 2, rows: 3, cells: 6, shape: 'glass' },
  '3x2': { columns: 3, rows: 2, cells: 6, shape: 'elegant' },
  '4x2': { columns: 4, rows: 2, cells: 8, shape: 'minimal' },
  '2x4': { columns: 2, rows: 4, cells: 8, shape: 'gradient' },
  'custom': { columns: 3, rows: 3, cells: 9, shape: 'modern' },
}

// Cell shape styles
const getCellShapeStyle = (shape: string, isResizing: boolean, columnSpan: number, rowSpan: number) => {
  const baseStyles: React.CSSProperties = {
    minHeight: '80px',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  }

  switch (shape) {
    case 'card':
      return {
        ...baseStyles,
        borderRadius: '16px',
        border: '2px solid rgba(255, 107, 53, 0.3)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        boxShadow: isResizing 
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1), 0 0 0 4px rgba(255, 107, 53, 0.2)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(10px)',
      }
    
    case 'rounded':
      return {
        ...baseStyles,
        borderRadius: columnSpan > 1 || rowSpan > 1 ? '20px' : '12px',
        border: '2px solid rgba(99, 102, 241, 0.4)',
        background: 'rgba(255, 255, 255, 0.9)',
        boxShadow: isResizing 
          ? '0 25px 50px -12px rgba(99, 102, 241, 0.4), 0 0 0 4px rgba(99, 102, 241, 0.2)' 
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    
    case 'modern':
      return {
        ...baseStyles,
        borderRadius: '0',
        border: 'none',
        borderTop: '3px solid rgba(255, 107, 53, 0.6)',
        borderLeft: '3px solid rgba(255, 107, 53, 0.6)',
        background: 'rgba(255, 255, 255, 0.98)',
        boxShadow: isResizing 
          ? 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.2)' 
          : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      }
    
    case 'glass':
      return {
        ...baseStyles,
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        boxShadow: isResizing 
          ? '0 8px 32px 0 rgba(31, 38, 135, 0.4), 0 0 0 4px rgba(255, 255, 255, 0.2)' 
          : '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        backdropFilter: 'blur(8px)',
      }
    
    case 'elegant':
      return {
        ...baseStyles,
        borderRadius: '8px',
        border: '2px dashed rgba(168, 85, 247, 0.4)',
        background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)',
        boxShadow: isResizing 
          ? '0 10px 15px -3px rgba(168, 85, 247, 0.3), 0 4px 6px -2px rgba(168, 85, 247, 0.2)' 
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }
    
    case 'minimal':
      return {
        ...baseStyles,
        borderRadius: '4px',
        border: '1px solid rgba(229, 231, 235, 0.8)',
        background: 'rgba(255, 255, 255, 1)',
        boxShadow: isResizing 
          ? '0 0 0 3px rgba(34, 197, 94, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }
    
    case 'gradient':
      return {
        ...baseStyles,
        borderRadius: '24px',
        border: '2px solid transparent',
        background: isResizing
          ? 'linear-gradient(white, white) padding-box, linear-gradient(135deg, rgba(255, 107, 53, 0.8), rgba(251, 146, 60, 0.8)) border-box'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 243, 199, 0.3) 100%)',
        boxShadow: isResizing 
          ? '0 20px 25px -5px rgba(255, 107, 53, 0.3), 0 10px 10px -5px rgba(255, 107, 53, 0.2)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }
    
    default:
      return {
        ...baseStyles,
        borderRadius: '12px',
        border: '2px solid rgba(156, 163, 175, 0.3)',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: isResizing 
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.2)' 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }
  }
}

// Grid Component Renderer for use in ComponentRenderer
export function GridComponentRenderer({
  component,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onUpdate,
  onAddToCell,
  previewMode = false,
}: {
  component: Component
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onUpdate?: (component: Component) => void
  onAddToCell?: (cellId: string, newComponent: Component) => void
  previewMode?: boolean
}) {
  return (
    <GridComponent
      component={component}
      isSelected={isSelected}
      isHovered={isHovered}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onUpdate={onUpdate}
      onAddToCell={onAddToCell}
      previewMode={previewMode}
    />
  )
}

// Cell Component with Drop Zone
function DroppableCell({
  cellId,
  child,
  index,
  gridColumns,
  columnSpan,
  rowSpan,
  gridColumn,
  gridRow,
  individualCellShape,
  isCellResizing,
  isCellHovered,
  previewMode,
  onDeleteCell,
  onAddToCell,
  onResizeStart,
  onHover,
  onHoverLeave,
}: {
  cellId: string
  child: Component
  index: number
  gridColumns: number
  columnSpan: number
  rowSpan: number
  gridColumn: number
  gridRow: number
  individualCellShape: string
  isCellResizing: boolean
  isCellHovered: boolean
  previewMode: boolean
  onDeleteCell?: (cellId: string) => void
  onAddToCell?: (cellId: string, newComponent: Component) => void
  onResizeStart?: (e: React.MouseEvent, cellId: string, direction: string) => void
  onHover?: (cellId: string) => void
  onHoverLeave?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-cell-${cellId}`,
    data: {
      type: 'grid-cell',
      cellId,
    },
  })

  const cellStyle = getCellShapeStyle(individualCellShape, isCellResizing, columnSpan, rowSpan)
  
  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => !previewMode && onHover && onHover(cellId)}
      onMouseLeave={() => !previewMode && onHoverLeave && onHoverLeave()}
      style={{
        gridColumn: `${gridColumn} / span ${columnSpan}`,
        gridRow: `${gridRow} / span ${rowSpan}`,
        ...cellStyle,
        padding: '16px',
        transform: isCellHovered && !previewMode ? 'translateY(-2px)' : 'translateY(0)',
        border: isOver ? '3px dashed #ff6b35' : cellStyle.border,
        backgroundColor: isOver ? 'rgba(255, 107, 53, 0.05)' : cellStyle.background,
      }}
      className={`group ${previewMode ? '' : 'cursor-move'} relative ${isOver ? 'z-50' : ''} ${isCellResizing ? 'z-50' : ''}`}
    >
      {/* Drop Indicator */}
      {isOver && !previewMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#ff6b35]/10 rounded-lg border-2 border-dashed border-[#ff6b35] z-40 pointer-events-none">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-[#ff6b35] rounded-full flex items-center justify-center animate-pulse">
              <FiPlus className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#ff6b35]">Drop widget here</span>
          </div>
        </div>
      )}

      {/* Empty Cell Placeholder */}
      {(!child.children || child.children.length === 0) && !previewMode && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
              <FiPlus className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-400">Drop widgets here</p>
          </div>
        </div>
      )}

      {!previewMode && (
        <>
          {/* Corner Resize Handles - Modern Style */}
          <div
            className="absolute top-0 right-0 w-5 h-5 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'bottom-right')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-bl-full shadow-lg border-2 border-white transform rotate-45" />
            <FiCornerDownRight className="absolute top-1 right-1 w-3 h-3 text-white z-10" />
          </div>
          <div
            className="absolute top-0 left-0 w-5 h-5 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'bottom-left')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-br-full shadow-lg border-2 border-white transform -rotate-45" />
            <FiCornerDownRight className="absolute top-1 left-1 w-3 h-3 text-white z-10 rotate-90" />
          </div>
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'top-right')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-tl-full shadow-lg border-2 border-white transform rotate-45" />
            <FiCornerDownRight className="absolute bottom-1 right-1 w-3 h-3 text-white z-10 -rotate-90" />
          </div>
          <div
            className="absolute bottom-0 left-0 w-5 h-5 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'top-left')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-tr-full shadow-lg border-2 border-white transform -rotate-45" />
            <FiCornerDownRight className="absolute bottom-1 left-1 w-3 h-3 text-white z-10 rotate-180" />
          </div>
          
          {/* Edge Resize Handles - Modern Bars */}
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'top')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="w-full h-full bg-gradient-to-b from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
          </div>
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-12 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'bottom')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="w-full h-full bg-gradient-to-b from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
          </div>
          <div
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-3 h-12 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'left')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="w-full h-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
          </div>
          <div
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-3 h-12 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation()
              if (onResizeStart) onResizeStart(e, cellId, 'right')
            }}
            style={{ zIndex: 30 }}
          >
            <div className="w-full h-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
          </div>
          
          {/* Delete Button - Modern Style */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onDeleteCell) onDeleteCell(cellId)
            }}
            className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:shadow-xl z-40 border-2 border-white"
            title="Delete Cell"
          >
            <FiX className="w-4 h-4" />
          </button>
          
          {/* Cell Info Badge - Modern Style */}
          <div className="absolute top-2 left-2 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg border border-white/20 backdrop-blur-sm">
            <span className="text-[#ff6b35] font-bold">{columnSpan}</span>
            <span className="mx-1">×</span>
            <span className="text-[#ff6b35] font-bold">{rowSpan}</span>
          </div>
          
          {/* Resize Indicator */}
          {isCellResizing && (
            <div className="absolute inset-0 border-4 border-[#ff6b35] rounded-lg pointer-events-none z-50 animate-pulse" />
          )}
        </>
      )}
      
      {/* Render Cell Content */}
      <div className="min-h-[60px] relative z-0">
        {child.children && child.children.length > 0 ? (
          child.children.map((grandChild) => (
            <ComponentRenderer
              key={grandChild.id}
              component={grandChild}
              isSelected={false}
              isHovered={false}
              onClick={() => {}}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              previewMode={previewMode}
            />
          ))
        ) : (
          <div className="min-h-[60px]" />
        )}
      </div>
    </div>
  )
}

export default function GridComponent({
  component,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onUpdate,
  onDelete,
  onDeleteCell,
  onAddToCell,
  previewMode = false,
}: GridComponentProps) {
  const [resizingCell, setResizingCell] = useState<string | null>(null)
  const [resizeDirection, setResizeDirection] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const resizeStartRef = useRef({ x: 0, y: 0, columnSpan: 1, rowSpan: 1, containerWidth: 0, containerHeight: 0 })
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const gridColumns = component.props?.columns || 3
  const gridRows = component.props?.rows || Math.ceil((component.children?.length || 0) / gridColumns)
  const gridGap = component.props?.gap || '24px'
  const gridTemplate = component.props?.template || 'custom'
  const cellShape = component.props?.cellShape || gridTemplates[gridTemplate as keyof typeof gridTemplates]?.shape || 'modern'

  // Parse gap value to get numeric value in pixels
  const getGapInPx = (gap: string): number => {
    if (gap.endsWith('px')) {
      return parseFloat(gap) || 20
    }
    return 20 // default
  }

  const gapPx = getGapInPx(gridGap)

  const handleCellResizeStart = (e: React.MouseEvent, cellId: string, direction: string) => {
    if (previewMode) return
    e.preventDefault()
    e.stopPropagation()
    
    const cell = component.children?.find(c => c.id === cellId)
    if (!cell || !gridContainerRef.current) return
    
    const cellProps = cell.props?.gridCell || {}
    const containerRect = gridContainerRef.current.getBoundingClientRect()
    
    setResizingCell(cellId)
    setResizeDirection(direction)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      columnSpan: cellProps.columnSpan || 1,
      rowSpan: cellProps.rowSpan || 1,
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
    }
  }

  useEffect(() => {
    if (!resizingCell || !resizeDirection || !gridContainerRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!onUpdate || !component.children) return
      
      const cell = component.children.find(c => c.id === resizingCell)
      if (!cell || !gridContainerRef.current) return

      const deltaX = e.clientX - resizeStartRef.current.x
      const deltaY = e.clientY - resizeStartRef.current.y
      
      // Get actual container dimensions
      const containerRect = gridContainerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width
      const containerHeight = containerRect.height
      
      // Calculate actual column width (accounting for gaps)
      // Total gap space = (columns - 1) * gap
      // Column width = (container width - total gaps) / columns
      const totalGapWidth = (gridColumns - 1) * gapPx
      const columnWidth = (containerWidth - totalGapWidth) / gridColumns
      
      // Calculate row height (approximate)
      const totalGapHeight = (gridRows - 1) * gapPx
      const rowHeight = (containerHeight - totalGapHeight) / gridRows
      
      // Calculate span changes based on actual pixel movement
      // Use smaller threshold for more granular control (20px minimum movement)
      const columnThreshold = Math.max(columnWidth * 0.3, 20) // 30% of column width or 20px, whichever is larger
      const rowThreshold = Math.max(rowHeight * 0.3, 20) // 30% of row height or 20px, whichever is larger
      
      let columnDelta = 0
      let rowDelta = 0
      
      if (Math.abs(deltaX) >= columnThreshold) {
        // Calculate how many columns the delta represents
        columnDelta = Math.round(deltaX / columnWidth)
      }
      
      if (Math.abs(deltaY) >= rowThreshold) {
        // Calculate how many rows the delta represents
        rowDelta = Math.round(deltaY / rowHeight)
      }

      let newColumnSpan = resizeStartRef.current.columnSpan
      let newRowSpan = resizeStartRef.current.rowSpan

      if (resizeDirection.includes('right')) {
        newColumnSpan = Math.max(1, resizeStartRef.current.columnSpan + columnDelta)
      }
      if (resizeDirection.includes('left')) {
        newColumnSpan = Math.max(1, resizeStartRef.current.columnSpan - columnDelta)
      }
      if (resizeDirection.includes('bottom')) {
        newRowSpan = Math.max(1, resizeStartRef.current.rowSpan + rowDelta)
      }
      if (resizeDirection.includes('top')) {
        newRowSpan = Math.max(1, resizeStartRef.current.rowSpan - rowDelta)
      }

      // Ensure spans don't exceed grid bounds
      newColumnSpan = Math.min(newColumnSpan, gridColumns)
      newRowSpan = Math.min(newRowSpan, gridRows)

      const updatedChildren = component.children.map(c => {
        if (c.id === resizingCell) {
          return {
            ...c,
            props: {
              ...c.props,
              gridCell: {
                ...(c.props?.gridCell || {}),
                columnSpan: newColumnSpan,
                rowSpan: newRowSpan,
              },
            },
          }
        }
        return c
      })

      onUpdate({
        ...component,
        children: updatedChildren,
      })
    }

    const handleMouseUp = () => {
      setResizingCell(null)
      setResizeDirection(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingCell, resizeDirection, component, onUpdate, gridColumns, gridRows])

  const handleDeleteCell = (cellId: string) => {
    if (onDeleteCell) {
      onDeleteCell(cellId)
    } else if (onUpdate && component.children) {
      const updatedChildren = component.children.filter(c => c.id !== cellId)
      onUpdate({
        ...component,
        children: updatedChildren,
      })
    }
  }

  return (
    <div
      ref={gridContainerRef}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, auto)`,
        gap: gridGap,
        padding: component.props?.padding || '20px',
        backgroundColor: component.props?.background || 'transparent',
        borderRadius: component.props?.radius || '16px',
        border: component.props?.border ? `2px solid ${component.props.borderColor || 'rgba(255, 107, 53, 0.2)'}` : 'none',
        boxShadow: component.props?.shadow 
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
          : 'none',
        background: component.props?.gradient 
          ? `linear-gradient(135deg, ${component.props.background || 'rgba(255, 255, 255, 0.5)'} 0%, rgba(248, 250, 252, 0.5) 100%)`
          : component.props?.background || 'transparent',
        ...component.style,
      }}
      className={`${component.className || ''} ${isSelected ? 'ring-4 ring-[#ff6b35] ring-offset-2' : ''} ${isHovered ? 'ring-2 ring-blue-400' : ''} transition-all duration-300`}
    >
      {component.children?.map((child, index) => {
        const cellProps = child.props?.gridCell || {}
        const gridColumn = cellProps.columnStart || (index % gridColumns) + 1
        const gridRow = cellProps.rowStart || Math.floor(index / gridColumns) + 1
        const columnSpan = cellProps.columnSpan || 1
        const rowSpan = cellProps.rowSpan || 1
        const isCellResizing = resizingCell === child.id
        const isCellHovered = hoveredCell === child.id
        const individualCellShape = cellProps.shape || cellShape
        
        return (
          <DroppableCell
            key={child.id}
            cellId={child.id}
            child={child}
            index={index}
            gridColumns={gridColumns}
            columnSpan={columnSpan}
            rowSpan={rowSpan}
            gridColumn={gridColumn}
            gridRow={gridRow}
            individualCellShape={individualCellShape}
            isCellResizing={isCellResizing}
            isCellHovered={isCellHovered}
            previewMode={previewMode}
            onDeleteCell={handleDeleteCell}
            onAddToCell={onAddToCell}
            onResizeStart={handleCellResizeStart}
            onHover={setHoveredCell}
            onHoverLeave={() => setHoveredCell(null)}
          />
        )
      })}
    </div>
  )
}

