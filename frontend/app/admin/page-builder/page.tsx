'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PageBuilder from '@/components/page-builder/PageBuilder'
import { Component } from '@/components/page-builder/types'
import { adminAPI } from '@/lib/api'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { FiX, FiList } from 'react-icons/fi'

function PageBuilderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated } = useAdminAuth()
  const [pageBuilderComponents, setPageBuilderComponents] = useState<Component[]>([])
  const [pageId, setPageId] = useState('')
  const [pageTitle, setPageTitle] = useState('Untitled Page')
  const [pageDescription, setPageDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showPageList, setShowPageList] = useState(false)
  const [pages, setPages] = useState<any[]>([])

  useEffect(() => {
    if (!isAuthenticated) return

    const id = searchParams.get('id')
    const load = searchParams.get('load')

    if (id) {
      setPageId(id)
      loadPage(id)
    } else if (load === 'new') {
      setPageId('')
      setPageTitle('Untitled Page')
      setPageDescription('')
      setPageBuilderComponents([])
      setIsLoading(false)
    } else {
      // Load saved page builder components if no specific page/type
      const savedComponents = localStorage.getItem('page_builder_components')
      if (savedComponents) {
        setPageBuilderComponents(JSON.parse(savedComponents))
      }
      setIsLoading(false)
    }

    fetchPages()
  }, [searchParams, isAuthenticated])

  const fetchPages = async () => {
    try {
      const response = await adminAPI.getPages()
      setPages(response.data.pages || [])
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    }
  }

  const loadPage = async (id: string) => {
    try {
      const response = await adminAPI.getPage(id)
      const data = response.data
      setPageTitle(data.title || 'Untitled Page')
      setPageDescription(data.description || '')
      setPageBuilderComponents(data.components || [])
      setPageId(data.page_id || id)
    } catch (error) {
      console.error('Error loading page:', error)
      alert('Failed to load page')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (components: Component[]) => {
    // Save to localStorage as backup
    localStorage.setItem('page_builder_components', JSON.stringify(components))
    
    // If pageId exists, update; otherwise, show save modal in PageBuilder
    if (pageId) {
      try {
        await adminAPI.updatePage(pageId, {
          components,
          title: pageTitle,
          description: pageDescription,
        })
        alert('Page updated successfully!')
        await fetchPages()
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to update page')
      }
    }
  }

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return
    try {
      await adminAPI.deletePage(id)
      alert('Page deleted successfully!')
      await fetchPages()
      if (pageId === id) {
        router.push('/admin/page-builder?load=new')
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete page')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading page builder...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Page List Button */}
      <button
        onClick={() => setShowPageList(true)}
        className="fixed top-4 right-4 z-[60] bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2 hover:bg-gray-50"
      >
        <FiList className="w-4 h-4" />
        <span>Pages</span>
      </button>

      {/* Page List Modal */}
      {showPageList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Saved Pages</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/admin/page-builder?load=new')}
                  className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a]"
                >
                  New Page
                </button>
                <button
                  onClick={() => setShowPageList(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {pages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No pages saved yet.</p>
                  <button
                    onClick={() => {
                      setShowPageList(false)
                      router.push('/admin/page-builder?load=new')
                    }}
                    className="mt-4 px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a]"
                  >
                    Create Your First Page
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{page.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            ID: {page.page_id} • {page.is_published ? 'Published' : 'Draft'}
                          </p>
                          {page.description && (
                            <p className="text-sm text-gray-600 mt-1">{page.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setShowPageList(false)
                              router.push(`/admin/page-builder?id=${page.page_id}`)
                            }}
                            className="px-3 py-1.5 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePage(page.page_id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PageBuilder
        initialComponents={pageBuilderComponents}
        pageId={pageId}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        onSave={handleSave}
        onClose={() => router.push('/admin/dashboard')}
      />
    </div>
  )
}

export default function PageBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <PageBuilderContent />
    </Suspense>
  )
}

