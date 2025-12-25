'use client'

import React, { useState, useEffect, useRef } from 'react'

interface RulerSystemProps {
  canvasRef: React.RefObject<HTMLDivElement>
  zoom: number
  showRulers?: boolean
  showGuides?: boolean
  snapToGrid?: boolean
  gridSize?: number
  onMeasurementChange?: (measurements: { x: number; y: number; width: number; height: number } | null) => void
}

export function RulerSystem({
  canvasRef,
  zoom,
  showRulers = true,
  showGuides = true,
  snapToGrid = false,
  gridSize = 10,
  onMeasurementChange,
}: RulerSystemProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [selectedElement, setSelectedElement] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [alignmentGuides, setAlignmentGuides] = useState<{
    vertical: number[]
    horizontal: number[]
  }>({ vertical: [], horizontal: [] })
  const rulerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !showRulers) return

    const getCanvasContent = () => {
      if (!canvasRef.current) return null
      return canvasRef.current.querySelector('.bg-white.shadow-lg') as HTMLElement
    }

    const handleMouseMove = (e: MouseEvent) => {
      const canvasContent = getCanvasContent()
      if (!canvasContent || !canvasRef.current) return
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const contentRect = canvasContent.getBoundingClientRect()
      const x = (e.clientX - contentRect.left) / zoom
      const y = (e.clientY - contentRect.top) / zoom
      setMousePosition({ x, y })
    }

    const handleElementSelect = () => {
      const selected = document.querySelector('[data-selected="true"]') as HTMLElement
      const canvasContent = getCanvasContent()
      if (selected && canvasContent && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const contentRect = canvasContent.getBoundingClientRect()
        const elementRect = selected.getBoundingClientRect()
        const x = (elementRect.left - contentRect.left) / zoom
        const y = (elementRect.top - contentRect.top) / zoom
        const width = elementRect.width / zoom
        const height = elementRect.height / zoom

        setSelectedElement({ x, y, width, height })
        if (onMeasurementChange) {
          onMeasurementChange({ x, y, width, height })
        }

        // Find alignment guides
        const allElements = canvasContent.querySelectorAll('[data-component-id]')
        const verticalGuides: number[] = []
        const horizontalGuides: number[] = []

        allElements.forEach((el) => {
          if (el === selected) return
          const elRect = el.getBoundingClientRect()
          const elX = (elRect.left - contentRect.left) / zoom
          const elY = (elRect.top - contentRect.top) / zoom
          const elWidth = elRect.width / zoom
          const elHeight = elRect.height / zoom

          // Check for vertical alignment
          if (Math.abs(elX - x) < 5) verticalGuides.push(elX)
          if (Math.abs(elX + elWidth - (x + width)) < 5) verticalGuides.push(elX + elWidth)
          if (Math.abs(elX + elWidth / 2 - (x + width / 2)) < 5) verticalGuides.push(elX + elWidth / 2)

          // Check for horizontal alignment
          if (Math.abs(elY - y) < 5) horizontalGuides.push(elY)
          if (Math.abs(elY + elHeight - (y + height)) < 5) horizontalGuides.push(elY + elHeight)
          if (Math.abs(elY + elHeight / 2 - (y + height / 2)) < 5) horizontalGuides.push(elY + elHeight / 2)
        })

        setAlignmentGuides({ vertical: verticalGuides, horizontal: horizontalGuides })
      } else {
        setSelectedElement(null)
        setAlignmentGuides({ vertical: [], horizontal: [] })
        if (onMeasurementChange) {
          onMeasurementChange(null)
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    const interval = setInterval(handleElementSelect, 100)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearInterval(interval)
    }
  }, [canvasRef, zoom, showRulers, showGuides, onMeasurementChange])

  if (!showRulers || !canvasRef.current) return null

  const rulerSize = 20
  const canvasContent = canvasRef.current.querySelector('.bg-white.shadow-lg') as HTMLElement
  if (!canvasContent) return null

  const canvasRect = canvasRef.current.getBoundingClientRect()
  const contentRect = canvasContent.getBoundingClientRect()
  const canvasWidth = contentRect.width / zoom
  const canvasHeight = Math.max(contentRect.height / zoom, 1000)

  const renderRuler = (orientation: 'horizontal' | 'vertical') => {
    const ticks: JSX.Element[] = []
    const step = zoom < 0.5 ? 100 : zoom < 1 ? 50 : 25
    const majorStep = step * 4

    if (orientation === 'horizontal') {
      for (let i = 0; i <= canvasWidth; i += step) {
        const isMajor = i % majorStep === 0
        ticks.push(
          <div
            key={i}
            className={`absolute border-l border-gray-400 ${isMajor ? 'border-gray-600' : ''}`}
            style={{
              left: `${i}px`,
              height: isMajor ? '100%' : '50%',
              top: isMajor ? '0' : '50%',
            }}
          >
            {isMajor && (
              <span
                className="absolute top-0 left-0.5 text-[10px] text-gray-600 whitespace-nowrap"
                style={{ transform: 'translateY(-100%)' }}
              >
                {Math.round(i)}px
              </span>
            )}
          </div>
        )
      }
    } else {
      for (let i = 0; i <= canvasHeight; i += step) {
        const isMajor = i % majorStep === 0
        ticks.push(
          <div
            key={i}
            className={`absolute border-t border-gray-400 ${isMajor ? 'border-gray-600' : ''}`}
            style={{
              top: `${i}px`,
              width: isMajor ? '100%' : '50%',
              left: isMajor ? '0' : '50%',
            }}
          >
            {isMajor && (
              <span
                className="absolute left-0 top-0.5 text-[10px] text-gray-600 whitespace-nowrap"
                style={{ transform: 'translateX(-100%) rotate(-90deg)', transformOrigin: 'center' }}
              >
                {Math.round(i)}px
              </span>
            )}
          </div>
        )
      }
    }

    return ticks
  }

  return (
    <>
      {/* Horizontal Ruler */}
      <div
        className="absolute top-0 left-0 right-0 bg-gray-100 border-b border-gray-300 z-50"
        style={{
          height: `${rulerSize}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="relative w-full h-full" style={{ width: `${canvasWidth}px` }}>
          {renderRuler('horizontal')}
          {/* Mouse position indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none"
            style={{ left: `${mousePosition.x}px` }}
          >
            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] px-1 whitespace-nowrap">
              {Math.round(mousePosition.x)}px
            </div>
          </div>
          {/* Selected element indicators */}
          {selectedElement && (
            <>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{ left: `${selectedElement.x}px` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{ left: `${selectedElement.x + selectedElement.width}px` }}
              />
            </>
          )}
        </div>
      </div>

      {/* Vertical Ruler */}
      <div
        className="absolute top-0 left-0 bottom-0 bg-gray-100 border-r border-gray-300 z-50"
        style={{
          width: `${rulerSize}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="relative w-full h-full" style={{ height: `${canvasHeight}px` }}>
          {renderRuler('vertical')}
          {/* Mouse position indicator */}
          <div
            className="absolute left-0 right-0 h-0.5 bg-indigo-500 z-10 pointer-events-none"
            style={{ top: `${mousePosition.y}px` }}
          >
            <div className="absolute left-0 top-0 bg-indigo-500 text-white text-[10px] px-1 whitespace-nowrap">
              {Math.round(mousePosition.y)}px
            </div>
          </div>
          {/* Selected element indicators */}
          {selectedElement && (
            <>
              <div
                className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{ top: `${selectedElement.y}px` }}
              />
              <div
                className="absolute left-0 right-0 h-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{ top: `${selectedElement.y + selectedElement.height}px` }}
              />
            </>
          )}
        </div>
      </div>

      {/* Alignment Guides */}
      {showGuides && selectedElement && (
        <>
          {alignmentGuides.vertical.map((x, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-40 pointer-events-none"
              style={{
                left: `${x * zoom + rulerSize}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            />
          ))}
          {alignmentGuides.horizontal.map((y, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-0.5 bg-green-500 z-40 pointer-events-none"
              style={{
                top: `${y * zoom + rulerSize}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            />
          ))}
        </>
      )}

      {/* Grid Overlay */}
      {snapToGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            marginTop: `${rulerSize}px`,
            marginLeft: `${rulerSize}px`,
          }}
        />
      )}

      {/* Measurement Info */}
      {selectedElement && (
        <div
          className="absolute bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow-lg z-50 pointer-events-none"
          style={{
            top: `${(selectedElement.y + selectedElement.height) * zoom + rulerSize + 5}px`,
            left: `${selectedElement.x * zoom + rulerSize}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          W: {Math.round(selectedElement.width)}px × H: {Math.round(selectedElement.height)}px
        </div>
      )}
    </>
  )
}

