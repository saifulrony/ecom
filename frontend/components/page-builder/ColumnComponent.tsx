'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Component } from './types'
import { FiX, FiPlus } from 'react-icons/fi'
import ComponentRenderer from './ComponentRenderer'

interface ColumnComponentProps {
  component: Component
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onUpdate?: (component: Component) => void
  onDelete?: (id: string) => void
  onDeleteColumn?: (columnId: string) => void
  previewMode?: boolean
}

// Column Templates
export const columnTemplates = {
  '1-col': { columns: 1, columnSizes: ['1fr'] },
  '2-col': { columns: 2, columnSizes: ['1fr', '1fr'] },
  '2-col-3-1': { columns: 2, columnSizes: ['3fr', '1fr'] },
  '2-col-1-3': { columns: 2, columnSizes: ['1fr', '3fr'] },
  '3-col': { columns: 3, columnSizes: ['1fr', '1fr', '1fr'] },
  '3-col-2-1-1': { columns: 3, columnSizes: ['2fr', '1fr', '1fr'] },
  '3-col-1-2-1': { columns: 3, columnSizes: ['1fr', '2fr', '1fr'] },
  '3-col-1-1-2': { columns: 3, columnSizes: ['1fr', '1fr', '2fr'] },
  '4-col': { columns: 4, columnSizes: ['1fr', '1fr', '1fr', '1fr'] },
  'custom': { columns: 2, columnSizes: ['1fr', '1fr'] },
}

// Column Component Renderer for use in ComponentRenderer
export function ColumnComponentRenderer({
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
    <ColumnComponent
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

export default function ColumnComponent({
  component,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onUpdate,
  onDelete,
  onDeleteColumn,
  previewMode = false,
}: ColumnComponentProps) {
  const [resizingColumn, setResizingColumn] = useState<number | null>(null)
  const resizeStartRef = useRef({ x: 0, width: 0 })

  const numColumns = component.props?.columns || 2
  const columnSizes = component.props?.columnSizes || Array(numColumns).fill('1fr')
  const gap = component.props?.gap || '20px'
  const align = component.props?.align || 'stretch'
  const responsive = component.props?.responsive !== false

  // Ensure we have the right number of children (columns)
  useEffect(() => {
    if (!component.children && onUpdate) {
      const generateId = () => `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newColumns: Component[] = []
      for (let i = 0; i < numColumns; i++) {
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
      onUpdate({
        ...component,
        children: newColumns,
      })
    }
  }, [component, numColumns, onUpdate])

  const handleColumnResizeStart = (e: React.MouseEvent, columnIndex: number) => {
    if (previewMode || !onUpdate) return
    e.preventDefault()
    e.stopPropagation()
    
    setResizingColumn(columnIndex)
    resizeStartRef.current = {
      x: e.clientX,
      width: parseFloat(columnSizes[columnIndex] || '1fr'),
    }
  }

  useEffect(() => {
    if (resizingColumn === null || !onUpdate) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!component.children || resizingColumn === null) return

      const deltaX = e.clientX - resizeStartRef.current.x
      const gridUnitSize = 50 // pixels per grid unit
      const deltaWidth = deltaX / gridUnitSize

      const newColumnSizes = [...columnSizes]
      const currentWidth = parseFloat(newColumnSizes[resizingColumn] || '1')
      
      // Calculate new width for resized column
      let newWidth = Math.max(0.5, currentWidth + deltaWidth)
      
      // Adjust adjacent column if available
      if (resizingColumn < newColumnSizes.length - 1) {
        const nextWidth = parseFloat(newColumnSizes[resizingColumn + 1] || '1')
        const widthDiff = newWidth - currentWidth
        newColumnSizes[resizingColumn + 1] = `${Math.max(0.5, nextWidth - widthDiff)}fr`
      }
      
      newColumnSizes[resizingColumn] = `${newWidth}fr`

      onUpdate({
        ...component,
        props: {
          ...component.props,
          columnSizes: newColumnSizes,
        },
      })
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingColumn, component, onUpdate, columnSizes])

  const handleDeleteColumn = (columnId: string) => {
    if (onDeleteColumn) {
      onDeleteColumn(columnId)
    } else if (onUpdate && component.children) {
      const updatedChildren = component.children.filter(c => c.id !== columnId)
      const newNumColumns = updatedChildren.length
      const newColumnSizes = columnSizes.slice(0, newNumColumns)
      
      onUpdate({
        ...component,
        children: updatedChildren,
        props: {
          ...component.props,
          columns: newNumColumns,
          columnSizes: newColumnSizes.length > 0 ? newColumnSizes : Array(newNumColumns).fill('1fr'),
        },
      })
    }
  }

  // Ensure children array matches number of columns
  const children = component.children || []
  const displayChildren = children.slice(0, numColumns)

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'grid',
        gridTemplateColumns: columnSizes.join(' '),
        gap: gap,
        alignItems: align,
        padding: component.props?.padding || '0',
        backgroundColor: component.props?.background || 'transparent',
        borderRadius: component.props?.radius || '0',
        border: component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
        boxShadow: component.props?.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        ...component.style,
      }}
      className={`${component.className || ''} ${isSelected ? 'ring-2 ring-[#ff6b35]' : ''} ${isHovered ? 'ring-2 ring-blue-300' : ''} ${responsive ? 'grid-cols-1 md:grid-cols-[var(--grid-cols)]' : ''}`}
    >
      {displayChildren.map((child, index) => (
        <div
          key={child.id}
          style={{
            position: 'relative',
            minHeight: '100px',
          }}
          className={`border border-dashed border-gray-300 rounded p-2 hover:border-gray-400 transition group ${previewMode ? '' : 'hover:bg-gray-50'}`}
        >
          {!previewMode && (
            <>
              {/* Resize Handle on the right */}
              {index < displayChildren.length - 1 && (
                <div
                  className="absolute top-0 right-0 w-1 h-full bg-blue-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition z-20 hover:w-2"
                  onMouseDown={(e) => handleColumnResizeStart(e, index)}
                  style={{ transform: 'translateX(50%)' }}
                />
              )}
              
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteColumn(child.id)
                }}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-700 z-20"
                title="Delete Column"
              >
                <FiX className="w-3 h-3" />
              </button>
              
              {/* Column Info Badge */}
              <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition z-10">
                Col {index + 1} ({columnSizes[index] || '1fr'})
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
      ))}
    </div>
  )
}

