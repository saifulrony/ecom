'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Component } from './types'
import { FiX, FiMaximize2, FiMinimize2, FiCornerDownRight } from 'react-icons/fi'
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

// Helper function to generate cells for a template with proper spans
export const generateCellsForTemplate = (template: string, generateId: () => string): Component[] => {
  const cells: Component[] = []
  
  switch (template) {
    case 'layout-1': // Full-Width Hero
      cells.push({
        id: generateId(),
        type: 'text',
        props: {
          text: 'Hero Section',
          gridCell: { columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
        },
        content: 'Hero Section',
      })
      break
      
    case 'layout-2': // Split Hero (50/50)
      cells.push(
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Left Column',
            gridCell: { columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Left Column',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Right Column',
            gridCell: { columnStart: 2, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Right Column',
        }
      )
      break
      
    case 'layout-3': // Asymmetric Hero (2/3 + 1/3)
      cells.push(
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Large Column',
            gridCell: { columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 1 },
          },
          content: 'Large Column',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Small Column',
            gridCell: { columnStart: 3, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Small Column',
        }
      )
      break
      
    case 'layout-4': // Three Equal Columns
      for (let i = 0; i < 3; i++) {
        cells.push({
          id: generateId(),
          type: 'text',
          props: {
            text: `Column ${i + 1}`,
            gridCell: { columnStart: i + 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: `Column ${i + 1}`,
        })
      }
      break
      
    case 'layout-5': // Four Equal Columns
      for (let i = 0; i < 4; i++) {
        cells.push({
          id: generateId(),
          type: 'text',
          props: {
            text: `Column ${i + 1}`,
            gridCell: { columnStart: i + 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: `Column ${i + 1}`,
        })
      }
      break
      
    case 'layout-6': // Masonry Large Left
      cells.push(
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Large Left',
            gridCell: { columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 2 },
          },
          content: 'Large Left',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Top Right',
            gridCell: { columnStart: 2, rowStart: 1, columnSpan: 2, rowSpan: 1 },
          },
          content: 'Top Right',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Right 1',
            gridCell: { columnStart: 2, rowStart: 2, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Bottom Right 1',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Right 2',
            gridCell: { columnStart: 3, rowStart: 2, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Bottom Right 2',
        }
      )
      break
      
    case 'layout-7': // Masonry Large Right
      cells.push(
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Top Left 1',
            gridCell: { columnStart: 1, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Top Left 1',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Top Left 2',
            gridCell: { columnStart: 2, rowStart: 1, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Top Left 2',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Large Right',
            gridCell: { columnStart: 3, rowStart: 1, columnSpan: 1, rowSpan: 2 },
          },
          content: 'Large Right',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Left',
            gridCell: { columnStart: 1, rowStart: 2, columnSpan: 2, rowSpan: 1 },
          },
          content: 'Bottom Left',
        }
      )
      break
      
    case 'layout-8': // Gallery Grid (4x2)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          cells.push({
            id: generateId(),
            type: 'text',
            props: {
              text: `Item ${row * 4 + col + 1}`,
              gridCell: { columnStart: col + 1, rowStart: row + 1, columnSpan: 1, rowSpan: 1 },
            },
            content: `Item ${row * 4 + col + 1}`,
          })
        }
      }
      break
      
    case 'layout-9': // Complex Asymmetric
      cells.push(
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Large Top',
            gridCell: { columnStart: 1, rowStart: 1, columnSpan: 2, rowSpan: 1 },
          },
          content: 'Large Top',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Mid Right 1',
            gridCell: { columnStart: 3, rowStart: 1, columnSpan: 1, rowSpan: 2 },
          },
          content: 'Mid Right 1',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Mid Right 2',
            gridCell: { columnStart: 4, rowStart: 1, columnSpan: 1, rowSpan: 2 },
          },
          content: 'Mid Right 2',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Left 1',
            gridCell: { columnStart: 1, rowStart: 2, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Bottom Left 1',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Left 2',
            gridCell: { columnStart: 2, rowStart: 2, columnSpan: 1, rowSpan: 1 },
          },
          content: 'Bottom Left 2',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Span',
            gridCell: { columnStart: 1, rowStart: 3, columnSpan: 2, rowSpan: 1 },
          },
          content: 'Bottom Span',
        },
        {
          id: generateId(),
          type: 'text',
          props: {
            text: 'Bottom Right',
            gridCell: { columnStart: 3, rowStart: 3, columnSpan: 2, rowSpan: 1 },
          },
          content: 'Bottom Right',
        }
      )
      break
      
    default:
      // Default: create cells in order
      const templateConfig = gridTemplates[template as keyof typeof gridTemplates]
      if (templateConfig) {
        for (let i = 0; i < templateConfig.cells; i++) {
          const row = Math.floor(i / templateConfig.columns) + 1
          const col = (i % templateConfig.columns) + 1
          cells.push({
            id: generateId(),
            type: 'text',
            props: {
              text: `Cell ${i + 1}`,
              gridCell: { columnStart: col, rowStart: row, columnSpan: 1, rowSpan: 1 },
            },
            content: `Cell ${i + 1}`,
          })
        }
      }
  }
  
  return cells
}

// Grid Templates - 9 Modern Layout Designs
export const gridTemplates = {
  // Template 1: Full-Width Hero (Single column, full width)
  'layout-1': { 
    columns: 1, 
    rows: 1, 
    cells: 1, 
    shape: 'modern',
    name: 'Full-Width Hero',
    description: 'Single full-width section'
  },
  
  // Template 2: Split Hero (50/50 split)
  'layout-2': { 
    columns: 2, 
    rows: 1, 
    cells: 2, 
    shape: 'rounded',
    name: 'Split Hero',
    description: 'Two equal columns side by side'
  },
  
  // Template 3: Asymmetric Hero (2/3 + 1/3)
  'layout-3': { 
    columns: 3, 
    rows: 1, 
    cells: 2, 
    shape: 'card',
    name: 'Asymmetric Hero',
    description: 'Large left, small right column'
  },
  
  // Template 4: Three Equal Columns
  'layout-4': { 
    columns: 3, 
    rows: 1, 
    cells: 3, 
    shape: 'modern',
    name: 'Three Columns',
    description: 'Three equal width columns'
  },
  
  // Template 5: Four Equal Columns
  'layout-5': { 
    columns: 4, 
    rows: 1, 
    cells: 4, 
    shape: 'minimal',
    name: 'Four Columns',
    description: 'Four equal width columns'
  },
  
  // Template 6: Masonry Left Large (Large left + 2 small right)
  'layout-6': { 
    columns: 3, 
    rows: 2, 
    cells: 4, 
    shape: 'card',
    name: 'Masonry Large Left',
    description: 'Large left column, 2 small right'
  },
  
  // Template 7: Masonry Right Large (2 small left + large right)
  'layout-7': { 
    columns: 3, 
    rows: 2, 
    cells: 4, 
    shape: 'glass',
    name: 'Masonry Large Right',
    description: '2 small left, large right column'
  },
  
  // Template 8: Gallery Grid (4x2 grid)
  'layout-8': { 
    columns: 4, 
    rows: 2, 
    cells: 8, 
    shape: 'rounded',
    name: 'Gallery Grid',
    description: '4 columns, 2 rows gallery'
  },
  
  // Template 9: Complex Asymmetric (Mixed sizes)
  'layout-9': { 
    columns: 4, 
    rows: 3, 
    cells: 7, 
    shape: 'modern',
    name: 'Complex Asymmetric',
    description: 'Mixed column sizes and heights'
  },
  
  // Legacy templates (kept for backward compatibility)
  '2x2': { columns: 2, rows: 2, cells: 4, shape: 'card' },
  '3x3': { columns: 3, rows: 3, cells: 9, shape: 'rounded' },
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
  onDelete,
  onDeleteCell,
  previewMode = false,
}: {
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
      onDelete={onDelete}
      onDeleteCell={onDeleteCell}
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
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const resizeStartRef = useRef({ 
    x: 0, 
    y: 0, 
    columnSpan: 1, 
    rowSpan: 1,
    width: 0,
    height: 0,
    columnStart: 1,
    rowStart: 1,
    containerWidth: 0, 
    containerHeight: 0 
  })
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const gridColumns = component.props?.columns || 3
  const gridRows = component.props?.rows || Math.ceil((component.children?.length || 0) / gridColumns)
  const gridGap = component.props?.gap || '24px'
  const gridTemplate = component.props?.template || 'custom'
  const cellShape = component.props?.cellShape || gridTemplates[gridTemplate as keyof typeof gridTemplates]?.shape || 'modern'
  
  // Always use standard grid - custom widths are applied via CSS width property
  // This ensures all cells maintain their positions and grid flow is predictable

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
    
    const cellIndex = component.children?.findIndex(c => c.id === cellId) || 0
    const cellProps = cell.props?.gridCell || {}
    const containerRect = gridContainerRef.current.getBoundingClientRect()
    const cellElement = e.currentTarget.closest('[data-grid-cell]') as HTMLElement
    const cellRect = cellElement?.getBoundingClientRect()
    
    // Get current width/height from cell props or actual rendered size
    const currentWidth = cellProps.width 
      ? parseFloat(cellProps.width.toString().replace('px', ''))
      : (cellRect ? cellRect.width : 0)
    const currentHeight = cellProps.height
      ? parseFloat(cellProps.height.toString().replace('px', ''))
      : (cellRect ? cellRect.height : 0)
    
    setResizingCell(cellId)
    setResizeDirection(direction)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      columnSpan: cellProps.columnSpan || 1,
      rowSpan: cellProps.rowSpan || 1,
      width: currentWidth,
      height: currentHeight,
      columnStart: cellProps.columnStart || (cellIndex % gridColumns) + 1,
      rowStart: cellProps.rowStart || Math.floor(cellIndex / gridColumns) + 1,
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
      const padding = parseFloat(component.props?.padding?.toString().replace('px', '') || '0')
      const availableWidth = containerWidth - (padding * 2)
      const availableHeight = containerHeight - (padding * 2)
      
      // Calculate actual column width and row height for column-based resizing
      const totalGapWidth = (gridColumns - 1) * gapPx
      const columnWidth = (availableWidth - totalGapWidth) / gridColumns
      const totalGapHeight = (gridRows - 1) * gapPx
      const rowHeight = (availableHeight - totalGapHeight) / gridRows
      
      // Minimum movement threshold (5px for immediate response)
      const threshold = 5
      
      // Check if we should use pixel-based (custom width) or column-based resizing
      const cellProps = cell.props?.gridCell || {}
      const usePixelResize = cellProps.width || Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold
      
      let updatedChildren = component.children.map(c => {
        if (c.id === resizingCell) {
          const currentCellProps = c.props?.gridCell || {}
          
          if (usePixelResize) {
            // Pixel-based resizing (custom width mode)
            let newWidth = resizeStartRef.current.width
            let newHeight = resizeStartRef.current.height
            
            // Minimum cell size
            const minWidth = 50
            const minHeight = 50

            // Handle horizontal resizing
            if (resizeDirection.includes('right')) {
              newWidth = Math.max(minWidth, resizeStartRef.current.width + deltaX)
              newWidth = Math.min(newWidth, availableWidth)
            }
            if (resizeDirection.includes('left')) {
              newWidth = Math.max(minWidth, resizeStartRef.current.width - deltaX)
              newWidth = Math.min(newWidth, availableWidth)
            }
            
            // Handle vertical resizing
            if (resizeDirection.includes('bottom')) {
              newHeight = Math.max(minHeight, resizeStartRef.current.height + deltaY)
              newHeight = Math.min(newHeight, availableHeight)
            }
            if (resizeDirection.includes('top')) {
              newHeight = Math.max(minHeight, resizeStartRef.current.height - deltaY)
              newHeight = Math.min(newHeight, availableHeight)
            }
            
            return {
              ...c,
              props: {
                ...c.props,
                gridCell: {
                  ...currentCellProps,
                  width: `${newWidth}px`,
                  height: newHeight > 0 ? `${newHeight}px` : currentCellProps.height,
                  // CRITICAL: Preserve exact position - NEVER change columnStart or rowStart
                  // This ensures other cells don't shift
                  columnStart: currentCellProps.columnStart || resizeStartRef.current.columnStart,
                  rowStart: currentCellProps.rowStart || resizeStartRef.current.rowStart,
                  // Keep original spans - don't recalculate as it can cause position shifts
                  columnSpan: currentCellProps.columnSpan || resizeStartRef.current.columnSpan,
                  rowSpan: currentCellProps.rowSpan || resizeStartRef.current.rowSpan,
                },
              },
            }
          } else {
            // Column-based resizing (standard grid mode)
            let newColumnSpan = resizeStartRef.current.columnSpan
            let newRowSpan = resizeStartRef.current.rowSpan

            // Calculate span changes based on movement
            if (Math.abs(deltaX) >= columnWidth * 0.3) {
              const columnDelta = Math.round(deltaX / columnWidth)
              if (resizeDirection.includes('right')) {
                newColumnSpan = Math.max(1, Math.min(gridColumns, resizeStartRef.current.columnSpan + columnDelta))
              }
              if (resizeDirection.includes('left')) {
                newColumnSpan = Math.max(1, Math.min(gridColumns, resizeStartRef.current.columnSpan - columnDelta))
              }
            }
            
            if (Math.abs(deltaY) >= rowHeight * 0.3) {
              const rowDelta = Math.round(deltaY / rowHeight)
              if (resizeDirection.includes('bottom')) {
                newRowSpan = Math.max(1, Math.min(gridRows, resizeStartRef.current.rowSpan + rowDelta))
              }
              if (resizeDirection.includes('top')) {
                newRowSpan = Math.max(1, Math.min(gridRows, resizeStartRef.current.rowSpan - rowDelta))
              }
            }
            
            return {
              ...c,
              props: {
                ...c.props,
                gridCell: {
                  ...currentCellProps,
                  columnSpan: newColumnSpan,
                  rowSpan: newRowSpan,
                  // Remove custom width if switching back to column mode
                  width: undefined,
                  height: undefined,
                },
              },
            }
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
        // Always use standard grid columns - cells with custom widths will override with explicit width
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, auto)`,
        gridAutoFlow: 'row',
        gap: gridGap,
        padding: component.props?.padding || '0',
        width: '100%',
        maxWidth: '100%',
        minWidth: '100%',
        margin: '0',
        backgroundColor: component.props?.background || 'transparent',
        borderRadius: component.props?.radius || '0',
        border: component.props?.border ? `2px solid ${component.props.borderColor || 'rgba(255, 107, 53, 0.2)'}` : 'none',
        boxShadow: component.props?.shadow 
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
          : 'none',
        background: component.props?.gradient 
          ? `linear-gradient(135deg, ${component.props.background || 'rgba(255, 255, 255, 0.5)'} 0%, rgba(248, 250, 252, 0.5) 100%)`
          : component.props?.background || 'transparent',
        ...component.style,
      }}
      className={`w-full ${component.className || ''} ${isSelected ? 'ring-4 ring-[#ff6b35] ring-offset-2' : ''} ${isHovered ? 'ring-2 ring-blue-400' : ''} transition-all duration-300`}
    >
      {component.children?.map((child, index) => {
        const cellProps = child.props?.gridCell || {}
        const isCellResizing = resizingCell === child.id
        const isCellHovered = hoveredCell === child.id
        const individualCellShape = cellProps.shape || cellShape
        
        // Calculate grid positioning
        let gridColumnStyle: string
        let gridRowStyle: string
        let cellWidth: string | undefined
        let cellHeight: string | undefined
        let displayColumnSpan: number | string
        let displayRowSpan: number | string
        
        // Get base positioning values - ALWAYS use stored values, never recalculate
        // This is critical to prevent cells from shifting when others are resized
        const baseColumnStart = cellProps.columnStart || (index % gridColumns) + 1
        const baseRowStart = cellProps.rowStart || Math.floor(index / gridColumns) + 1
        let baseColumnSpan = cellProps.columnSpan || 1
        let baseRowSpan = cellProps.rowSpan || 1
        
        // Always use standard grid columns - keeps all cells in same grid system
        // Cells with custom widths will use explicit width CSS which works alongside grid
        gridColumnStyle = `${baseColumnStart} / span ${baseColumnSpan}`
        gridRowStyle = `${baseRowStart} / span ${baseRowSpan}`
        
        // For cells with custom width, set explicit width but keep using grid columns
        // The explicit width will override the grid column width for that cell only
        if (cellProps.width) {
          cellWidth = cellProps.width.toString()
          cellHeight = cellProps.height?.toString()
          displayColumnSpan = cellProps.width.toString().replace('px', '') + 'px'
          displayRowSpan = cellProps.height ? cellProps.height.toString().replace('px', '') + 'px' : baseRowSpan
        } else {
          displayColumnSpan = baseColumnSpan
          displayRowSpan = baseRowSpan
        }
        
        return (
          <div
            key={child.id}
            data-grid-cell
            onMouseEnter={() => !previewMode && setHoveredCell(child.id)}
            onMouseLeave={() => !previewMode && setHoveredCell(null)}
            style={{
              gridColumn: gridColumnStyle,
              gridRow: gridRowStyle,
              // Use min-width/max-width for custom widths instead of width to maintain grid flow
              minWidth: cellWidth || 'auto',
              maxWidth: cellWidth || 'none',
              width: cellWidth || 'auto',
              minHeight: cellHeight || 'auto',
              maxHeight: cellHeight || 'none',
              height: cellHeight || 'auto',
              ...getCellShapeStyle(individualCellShape, isCellResizing, parseFloat(cellWidth?.replace('px', '') || '0') || baseColumnSpan, parseFloat(cellHeight?.replace('px', '') || '0') || baseRowSpan),
              padding: '16px',
              transform: isCellHovered && !previewMode ? 'translateY(-2px)' : 'translateY(0)',
              // Ensure cell doesn't shrink below its content or custom width
              overflow: 'auto',
            }}
            className={`group ${previewMode ? '' : 'cursor-move'} ${isCellResizing ? 'z-50' : ''}`}
          >
            {!previewMode && (
              <>
                {/* Corner Resize Handles - Modern Style */}
                <div
                  className="absolute top-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'bottom-right')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-bl-full shadow-lg border-2 border-white transform rotate-45" />
                  <FiCornerDownRight className="absolute top-1.5 right-1.5 w-3 h-3 text-white z-10" />
                </div>
                <div
                  className="absolute top-0 left-0 w-6 h-6 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'bottom-left')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-br-full shadow-lg border-2 border-white transform -rotate-45" />
                  <FiCornerDownRight className="absolute top-1.5 left-1.5 w-3 h-3 text-white z-10 rotate-90" />
                </div>
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'top-right')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-tl-full shadow-lg border-2 border-white transform rotate-45" />
                  <FiCornerDownRight className="absolute bottom-1.5 right-1.5 w-3 h-3 text-white z-10 -rotate-90" />
                </div>
                <div
                  className="absolute bottom-0 left-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'top-left')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-tr-full shadow-lg border-2 border-white transform -rotate-45" />
                  <FiCornerDownRight className="absolute bottom-1.5 left-1.5 w-3 h-3 text-white z-10 rotate-180" />
                </div>
                
                {/* Edge Resize Handles - Modern Bars */}
                <div
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-4 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'top')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="w-full h-full bg-gradient-to-b from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
                </div>
                <div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-14 h-4 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'bottom')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="w-full h-full bg-gradient-to-b from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
                </div>
                <div
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-14 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'left')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
                </div>
                <div
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-4 h-14 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCellResizeStart(e, child.id, 'right')
                  }}
                  style={{ zIndex: 30, pointerEvents: 'auto' }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-full shadow-lg border-2 border-white" />
                </div>
                
                {/* Delete Button - Modern Style */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCell(child.id)
                  }}
                  className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:shadow-xl z-40 border-2 border-white"
                  title="Delete Cell"
                >
                  <FiX className="w-4 h-4" />
                </button>
                
                {/* Cell Info Badge - Modern Style */}
                <div className="absolute top-2 left-2 bg-gradient-to-br from-gray-900 to-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg border border-white/20 backdrop-blur-sm">
                  <span className="text-[#ff6b35] font-bold">{displayColumnSpan}</span>
                  <span className="mx-1">×</span>
                  <span className="text-[#ff6b35] font-bold">{displayRowSpan}</span>
                </div>
                
                {/* Resize Indicator */}
                {isCellResizing && (
                  <div className="absolute inset-0 border-4 border-[#ff6b35] rounded-lg pointer-events-none z-50 animate-pulse" />
                )}
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

