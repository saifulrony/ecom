'use client'

import React from 'react'
import ComponentRenderer from './page-builder/ComponentRenderer'
import { Component } from './page-builder/types'

interface PageRendererProps {
  components: Component[]
}

export default function PageRenderer({ components }: PageRendererProps) {
  // Handle empty or invalid components
  if (!components || components.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-500 text-lg mb-4">This page has no content yet.</p>
          <p className="text-gray-400 text-sm">Please edit this page using the page builder in the admin panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
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
  )
}

