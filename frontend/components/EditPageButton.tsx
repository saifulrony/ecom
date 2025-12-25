'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiEdit2 } from 'react-icons/fi'
import PageEditor from './PageEditor'

export default function EditPageButton() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [showEditor, setShowEditor] = useState(false)

  // Only show for admin users
  if (!user || user.role !== 'admin') {
    return null
  }

  // Don't show on admin pages or API routes
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/api') || pathname?.startsWith('/pages')) {
    return null
  }

  // Generate page ID from pathname
  const pageId = pathname === '/' ? 'home' : pathname.replace(/^\//, '').replace(/\//g, '-')

  const handleEdit = () => {
    setShowEditor(true)
  }

  const handleClose = () => {
    setShowEditor(false)
    // Reload the page to see changes
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={handleEdit}
        className="fixed bottom-6 right-6 z-50 bg-[#ff6b35] text-white rounded-full p-4 shadow-lg hover:bg-[#ff8c5a] transition-all flex items-center justify-center group"
        title="Edit this page"
      >
        <FiEdit2 className="w-5 h-5" />
        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Edit Page
        </span>
      </button>
      {showEditor && (
        <PageEditor
          pageId={pageId}
          pageTitle={`Edit ${pageId === 'home' ? 'Home' : pageId}`}
          onClose={handleClose}
        />
      )}
    </>
  )
}

