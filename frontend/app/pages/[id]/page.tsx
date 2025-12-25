'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ComponentRenderer from '@/components/page-builder/ComponentRenderer'
import { Component } from '@/components/page-builder/types'

export default function DynamicPage() {
  const params = useParams()
  const pageId = params.id as string
  const [components, setComponents] = useState<Component[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPage = async () => {
      try {
        // Use public API endpoint (without /admin prefix)
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        const response = await fetch(`http://${hostname}:10000/api/pages/${pageId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Page not found')
          } else {
            setError('Failed to load page')
          }
          setLoading(false)
          return
        }
        const data = await response.json()
        setComponents(data.components || [])
      } catch (err: any) {
        setError('Failed to load page')
      } finally {
        setLoading(false)
      }
    }

    if (pageId) {
      loadPage()
    }
  }, [pageId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading page...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen">
        {components.length === 0 ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">This page is empty</p>
              <p className="text-sm">Add components using the page builder</p>
            </div>
          </div>
        ) : (
          <div>
            {components.map((component) => (
              <ComponentRenderer
                key={component.id}
                component={component}
                isSelected={false}
                isHovered={false}
                onClick={() => {}}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                previewMode={true}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

