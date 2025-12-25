'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import PageBuilder from './page-builder/PageBuilder'
import { Component } from './page-builder/types'
import { adminAPI } from '@/lib/api'
import { FiEdit2, FiX } from 'react-icons/fi'

interface PageEditorProps {
  pageId?: string
  pageTitle?: string
  pageDescription?: string
  initialComponents?: Component[]
  onClose?: () => void
  onSave?: (components: Component[]) => void
}

export default function PageEditor({
  pageId,
  pageTitle: initialTitle = 'Untitled Page',
  pageDescription: initialDescription = '',
  initialComponents = [],
  onClose,
  onSave,
}: PageEditorProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [components, setComponents] = useState<Component[]>(initialComponents)
  const [pageTitle, setPageTitle] = useState(initialTitle)
  const [pageDescription, setPageDescription] = useState(initialDescription)
  const [loading, setLoading] = useState(!!pageId)

  useEffect(() => {
    if (pageId && user?.role === 'admin') {
      loadPage()
    } else {
      setLoading(false)
    }
  }, [pageId, user])

  const loadPage = async () => {
    try {
      const response = await adminAPI.getPage(pageId!)
      const data = response.data
      setPageTitle(data.title || 'Untitled Page')
      setPageDescription(data.description || '')
      setComponents(data.components || [])
    } catch (error) {
      console.error('Failed to load page:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (savedComponents: Component[]) => {
    setComponents(savedComponents)
    if (onSave) {
      onSave(savedComponents)
    }
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="text-white">Loading page editor...</div>
      </div>
    )
  }

  return (
    <PageBuilder
      initialComponents={components}
      pageId={pageId}
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      onSave={handleSave}
      onClose={onClose}
    />
  )
}

