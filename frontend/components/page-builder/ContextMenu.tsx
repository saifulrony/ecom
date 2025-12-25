'use client'

import React from 'react'
import {
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiArrowUp,
  FiArrowDown,
  FiX,
} from 'react-icons/fi'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onCopy?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

export function ContextMenu({
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onCopy,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: ContextMenuProps) {
  const handleAction = (action?: () => void) => {
    if (action) {
      action()
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />

      {/* Menu */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      >
        {onEdit && (
          <button
            onClick={() => handleAction(onEdit)}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FiEdit2 className="h-4 w-4 mr-3 text-indigo-600" />
            Edit
          </button>
        )}

        {onDuplicate && (
          <button
            onClick={() => handleAction(onDuplicate)}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FiCopy className="h-4 w-4 mr-3 text-blue-600" />
            Duplicate
          </button>
        )}

        {onCopy && (
          <button
            onClick={() => handleAction(onCopy)}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FiCopy className="h-4 w-4 mr-3 text-gray-600" />
            Copy
          </button>
        )}

        {(onMoveUp || onMoveDown) && (
          <div className="border-t border-gray-200 my-1" />
        )}

        {onMoveUp && (
          <button
            onClick={() => handleAction(onMoveUp)}
            disabled={!canMoveUp}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiArrowUp className="h-4 w-4 mr-3 text-green-600" />
            Move Up
          </button>
        )}

        {onMoveDown && (
          <button
            onClick={() => handleAction(onMoveDown)}
            disabled={!canMoveDown}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiArrowDown className="h-4 w-4 mr-3 text-green-600" />
            Move Down
          </button>
        )}

        {onDelete && (
          <>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={() => handleAction(onDelete)}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <FiTrash2 className="h-4 w-4 mr-3" />
              Delete
            </button>
          </>
        )}
      </div>
    </>
  )
}

