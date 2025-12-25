'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'

interface DropZoneProps {
  id: string
  index: number
}

export function DropZone({ id, index }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${
        isOver
          ? 'h-8 bg-indigo-200 border-2 border-dashed border-indigo-500 rounded my-2'
          : 'h-0 my-0'
      }`}
      style={{
        // Prevent layout shift by maintaining consistent spacing
        minHeight: isOver ? '32px' : '0px',
        boxSizing: 'border-box',
      }}
    />
  )
}

