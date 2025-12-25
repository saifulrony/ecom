'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Component } from '@/components/page-builder/types'

export function usePageBuilderPage(pageId: string | null) {
  const [components, setComponents] = useState<Component[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageExists, setPageExists] = useState(false)

  useEffect(() => {
    if (!pageId) {
      setLoading(false)
      return
    }

    const loadPage = async () => {
      try {
        setLoading(true)
        setError(null)
        // Use public API endpoint (no auth required)
        console.log(`Loading page with pageId: ${pageId}`)
        const response = await api.get(`/pages/${pageId}`)
        console.log('Page response:', response.data)
        const pageComponents = response.data.components || []
        
        console.log('Page components:', pageComponents, 'Is array:', Array.isArray(pageComponents), 'Length:', pageComponents.length)
        
        // Check if components is an array and not empty
        if (Array.isArray(pageComponents) && pageComponents.length > 0) {
          setComponents(pageComponents)
          setPageExists(true)
          console.log('Page loaded successfully with', pageComponents.length, 'components')
        } else {
          // Page exists but has no components
          console.log('Page exists but has no components')
          setComponents([])
          setPageExists(true)
        }
      } catch (err: any) {
        // Page not found is not an error - just means no custom page
        console.log('Page load error:', err.response?.status, err.response?.data)
        if (err.response?.status !== 404) {
          console.error('Failed to load page:', err)
          setError(err.response?.data?.error || 'Failed to load page')
        }
        setComponents([])
        setPageExists(false)
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [pageId])

  // hasPage is true if page exists AND has components
  return { components, loading, error, hasPage: pageExists && components.length > 0, pageExists }
}

