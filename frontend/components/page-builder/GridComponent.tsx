'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Component } from './types'
import { FiX, FiMaximize2, FiMinimize2 } from 'react-icons/fi'
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
  previewMode?: boolean
}

// Grid Templates
export const gridTemplates = {
  '2x2': { columns: 2, rows: 2, cells: 4 },
  '3x3': { columns: 3, rows: 3, cells: 9 },
  '4x4': { columns: 4, rows: 4, cells: 16 },
  '2x3': { columns: 2, rows: 3, cells: 6 },
  '3x2': { columns: 3, rows: 2, cells: 6 },
  '4x2': { columns: 4, rows: 2, cells: 8 },
  '2x4': { columns: 2, rows: 4, cells: 8 },
  'custom': { columns: 3, rows: 3, cells: 9 },
}

// Grid Component Renderer for use in ComponentRenderer
export function GridComponentRenderer({
  component,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  previewMode = false,
}: {
  component: Component
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
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
      previewMode={previewMode}
    />
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
  previewMode = false,
}: GridComponentProps) {
  const [resizingCell, setResizingCell] = useState<string | null>(null)
  const [resizeDirection, setResizeDirection] = useState<string | null>(null)
  const resizeStartRef = useRef({ x: 0, y: 0, columnSpan: 1, rowSpan: 1, containerWidth: 0, containerHeight: 0 })
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const gridColumns = component.props?.columns || 3
  const gridRows = component.props?.rows || Math.ceil((component.children?.length || 0) / gridColumns)
  const gridGap = component.props?.gap || '20px'
  const gridTemplate = component.props?.template || 'custom'

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
        padding: component.props?.padding || '0',
        backgroundColor: component.props?.background || 'transparent',
        borderRadius: component.props?.radius || '0',
        border: component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
        boxShadow: component.props?.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        ...component.style,
      }}
      className={`${component.className || ''} ${isSelected ? 'ring-2 ring-[#ff6b35]' : ''} ${isHovered ? 'ring-2 ring-blue-300' : ''}`}
    >
      {component.children?.map((child, index) => {
        const cellProps = child.props?.gridCell || {}
        const gridColumn = cellProps.columnStart || (index % gridColumns) + 1
        const gridRow = cellProps.rowStart || Math.floor(index / gridColumns) + 1
        const columnSpan = cellProps.columnSpan || 1
        const rowSpan = cellProps.rowSpan || 1
        
        return (
          <div
            key={child.id}
            style={{
              gridColumn: `${gridColumn} / span ${columnSpan}`,
              gridRow: `${gridRow} / span ${rowSpan}`,
              minHeight: '50px',
              position: 'relative',
            }}
            className={`border border-dashed border-gray-300 rounded p-2 hover:border-gray-400 transition group ${previewMode ? '' : 'hover:bg-gray-50'}`}
          >
            {!previewMode && (
              <>
                {/* Resize Handles */}
                <div
                  className="absolute top-0 right-0 w-3 h-3 bg-blue-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'bottom-right')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute top-0 left-0 w-3 h-3 bg-blue-500 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'bottom-left')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'top-right')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'top-left')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-blue-500 cursor-ns-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'top')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-blue-500 cursor-ns-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'bottom')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-blue-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'left')}
                  style={{ zIndex: 10 }}
                />
                <div
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-blue-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition"
                  onMouseDown={(e) => handleCellResizeStart(e, child.id, 'right')}
                  style={{ zIndex: 10 }}
                />
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCell(child.id)
                  }}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-700 z-20"
                  title="Delete Cell"
                >
                  <FiX className="w-3 h-3" />
                </button>
                
                {/* Cell Info Badge */}
                <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition z-10">
                  {columnSpan}x{rowSpan}
                </div>
              </>
            )}
            
            <ComponentRenderer
              component={child}
              isSelected={false}
              isHovered={false}
              onClick={() => {}}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              previewMode={previewMode}
            />
          </div>
        )
      })}
    </div>
  )
}

