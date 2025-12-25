'use client'

import React, { useState, useEffect } from 'react'
import { Component } from './types'
import Image from 'next/image'
import Link from 'next/link'
import { productAPI } from '@/lib/api'

interface ComponentRendererProps {
  component: Component
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onUpdate?: (component: Component) => void
  onDelete?: (id: string) => void
  previewMode?: boolean
}

export default function ComponentRenderer({
  component,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  previewMode = false,
}: ComponentRendererProps) {
  // Merge styles: props.style < component.style (component.style takes precedence)
  const baseStyle: React.CSSProperties = {
    ...(component.props.style || {}),
    ...component.style, // Component style takes precedence
  }

  const renderComponent = () => {
    switch (component.type) {
      case 'heading':
        const HeadingTag = (component.props?.level || 'h1') as keyof JSX.IntrinsicElements
        return (
          <HeadingTag
            style={{
              color: component.props?.color || '#000000',
              fontSize: component.props?.fontSize || '2.5rem',
              textAlign: component.props?.align || 'left',
              fontWeight: component.props?.fontWeight || 'bold',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.props?.text || component.content || 'Heading Text'}
          </HeadingTag>
        )

      case 'text':
        return (
          <p
            style={{
              color: component.props?.color || '#333333',
              textAlign: component.props?.align || 'left',
              fontSize: component.props?.fontSize || '1rem',
              lineHeight: component.props?.lineHeight || '1.6',
              ...baseStyle,
            }}
            className={component.className}
            dangerouslySetInnerHTML={{ __html: component.props?.text || component.content || '' }}
          />
        )

      case 'button':
        const ButtonContent = (
          <button
            style={{
              backgroundColor: component.props?.variant === 'primary' ? '#ff6b35' : component.props?.bgColor || '#f3f4f6',
              color: component.props?.variant === 'primary' ? '#ffffff' : component.props?.color || '#000000',
              padding: component.props?.size === 'lg' ? '12px 24px' : component.props?.size === 'sm' ? '6px 12px' : '8px 16px',
              borderRadius: component.props?.rounded ? '9999px' : '8px',
              border: component.props?.variant === 'outline' ? '2px solid #ff6b35' : 'none',
              fontSize: component.props?.fontSize || '1rem',
              fontWeight: component.props?.fontWeight || '600',
              cursor: 'pointer',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.props?.text || component.content || 'Button'}
          </button>
        )
        return component.props?.link ? (
          <Link href={component.props.link} style={{ display: 'inline-block', textAlign: component.props?.align || 'left' }}>
            {ButtonContent}
          </Link>
        ) : (
          <div style={{ textAlign: component.props?.align || 'left' }}>{ButtonContent}</div>
        )

      case 'image':
        return (
          <div style={{ textAlign: component.props?.align || 'left', ...baseStyle }}>
            {component.props?.src ? (
              <Image
                src={component.props.src}
                alt={component.props?.alt || 'Image'}
                width={component.props?.width === 'auto' ? 800 : parseInt(component.props?.width) || 800}
                height={component.props?.height === 'auto' ? 600 : parseInt(component.props?.height) || 600}
                className={component.className}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <div
                className="bg-gray-200 flex items-center justify-center"
                style={{
                  width: component.props?.width || '100%',
                  height: component.props?.height || '300px',
                  minHeight: '200px',
                }}
              >
                <span className="text-gray-400">No image selected</span>
              </div>
            )}
          </div>
        )

      case 'section':
        return (
          <section
            style={{
              padding: component.props?.padding || '40px',
              backgroundColor: component.props?.background || '#ffffff',
              textAlign: component.props?.align || 'center',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.children?.map((child) => (
              <ComponentRenderer
                key={child.id}
                component={child}
                isSelected={false}
                isHovered={false}
                onClick={() => {}}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                previewMode={previewMode}
              />
            ))}
          </section>
        )

      case 'container':
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${component.props?.columns || 2}, 1fr)`,
              gap: component.props?.gap || '20px',
              padding: component.props?.padding || '20px',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.children?.map((child) => (
              <ComponentRenderer
                key={child.id}
                component={child}
                isSelected={false}
                isHovered={false}
                onClick={() => {}}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                previewMode={previewMode}
              />
            ))}
          </div>
        )

      case 'spacer':
        return (
          <div
            style={{
              height: component.props?.height || '40px',
              ...baseStyle,
            }}
            className={component.className}
          />
        )

      case 'divider':
        return (
          <hr
            style={{
              borderColor: component.props?.color || '#e5e7eb',
              borderWidth: component.props?.thickness || '1px',
              borderStyle: component.props?.style || 'solid',
              margin: component.props?.margin || '20px 0',
              ...baseStyle,
            }}
            className={component.className}
          />
        )

      case 'card':
        return (
          <div
            style={{
              padding: component.props?.padding || '20px',
              backgroundColor: component.props?.background || '#ffffff',
              border: component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
              borderRadius: component.props?.radius || '8px',
              boxShadow: component.props?.shadow ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.props?.title && (
              <h3 style={{ marginBottom: '10px', fontSize: '1.25rem', fontWeight: 'bold' }}>
                {component.props.title}
              </h3>
            )}
            <div>{component.props?.content || 'Card content'}</div>
          </div>
        )

      case 'grid':
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${component.props?.columns || 3}, 1fr)`,
              gap: component.props?.gap || '20px',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.children?.map((child) => (
              <ComponentRenderer
                key={child.id}
                component={child}
                isSelected={false}
                isHovered={false}
                onClick={() => {}}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                previewMode={previewMode}
              />
            ))}
          </div>
        )

      case 'video':
        return (
          <div style={{ ...baseStyle }} className={component.className}>
            {component.props?.src ? (
              <iframe
                src={component.props.src}
                width={component.props?.width || '100%'}
                height={component.props?.height || '400px'}
                style={{ border: 'none' }}
                allowFullScreen
              />
            ) : (
              <div className="bg-gray-200 flex items-center justify-center" style={{ width: '100%', height: '400px' }}>
                <span className="text-gray-400">No video URL provided</span>
              </div>
            )}
          </div>
        )

      case 'products-grid':
        return <ProductsGridComponent limit={component.props?.limit || 12} columns={component.props?.columns || 4} />

      case 'featured-products':
        return <FeaturedProductsComponent limit={component.props?.limit || 6} columns={component.props?.columns || 3} />

      case 'product-search':
        return <ProductSearchComponent placeholder={component.props?.placeholder || 'Search products...'} />

      case 'contact-form':
        return <ContactFormComponent title={component.props?.title || 'Contact Us'} />

      case 'newsletter':
        return <NewsletterComponent title={component.props?.title || 'Subscribe'} placeholder={component.props?.placeholder || 'Enter email'} />

      case 'slider':
        return <SliderComponent items={component.children || []} />

      case 'banner':
        return (
          <BannerComponent
            title={component.props?.title || 'Banner Title'}
            subtitle={component.props?.subtitle || 'Banner subtitle'}
            image={component.props?.image || ''}
            height={component.props?.height || '400px'}
          />
        )

      case 'testimonials':
        return <TestimonialsComponent items={component.props?.items || []} />

      case 'faq':
        return <FAQComponent items={component.props?.items || []} />

      case 'code-block':
        return (
          <pre
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              padding: '20px',
              borderRadius: '8px',
              overflow: 'auto',
              ...baseStyle,
            }}
            className={component.className}
          >
            <code>{component.props?.code || '// Code goes here'}</code>
          </pre>
        )

      case 'alert':
        const alertColors = {
          info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
          success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
          warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
          error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
        }
        const colors = alertColors[component.props?.type as keyof typeof alertColors] || alertColors.info
        return (
          <div
            style={{
              backgroundColor: colors.bg,
              borderLeft: `4px solid ${colors.border}`,
              color: colors.text,
              padding: '12px 16px',
              borderRadius: '4px',
              ...baseStyle,
            }}
            className={component.className}
          >
            {component.props?.text || component.content || 'Alert message'}
          </div>
        )

      case 'social-icons':
        return <SocialIconsComponent platforms={component.props?.platforms || []} size={component.props?.size || 'md'} />

      default:
        return (
          <div style={baseStyle} className={component.className}>
            {component.content || `Component: ${component.type}`}
          </div>
        )
    }
  }

  return (
    <div
      data-component-content
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={previewMode ? {} : { position: 'relative' }}
    >
      {renderComponent()}
    </div>
  )
}

// Dynamic Components
function ProductsGridComponent({ limit, columns }: { limit: number; columns: number }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productAPI.getProducts({ limit, page: 1 })
        setProducts(response.data.products || [])
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [limit])

  if (loading) return <div className="text-center py-8">Loading products...</div>

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-[#ff6b35] font-bold">৳{product.price}</p>
        </div>
      ))}
    </div>
  )
}

function FeaturedProductsComponent({ limit, columns }: { limit: number; columns: number }) {
  return <ProductsGridComponent limit={limit} columns={columns} />
}

function ProductSearchComponent({ placeholder }: { placeholder: string }) {
  return (
    <div className="max-w-md mx-auto">
      <input
        type="text"
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
      />
    </div>
  )
}

function ContactFormComponent({ title }: { title: string }) {
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <form className="space-y-4">
        <input type="text" placeholder="Name" className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white" />
        <input type="email" placeholder="Email" className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white" />
        <textarea placeholder="Message" rows={4} className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white" />
        <button type="submit" className="w-full bg-[#ff6b35] text-white py-2 rounded-lg">
          Send
        </button>
      </form>
    </div>
  )
}

function NewsletterComponent({ title, placeholder }: { title: string; placeholder: string }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div className="flex space-x-2">
        <input
          type="email"
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border rounded-lg text-gray-900 bg-white"
        />
        <button className="bg-[#ff6b35] text-white px-6 py-2 rounded-lg">Subscribe</button>
      </div>
    </div>
  )
}

function SliderComponent({ items }: { items: Component[] }) {
  return (
    <div className="relative h-96 bg-gray-200 rounded-lg flex items-center justify-center">
      <span className="text-gray-400">Slider Component</span>
    </div>
  )
}

function BannerComponent({ title, subtitle, image, height }: { title: string; subtitle: string; image: string; height: string }) {
  return (
    <div
      className="relative rounded-lg flex items-center justify-center text-white"
      style={{
        height,
        backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-2">{title}</h2>
        <p className="text-xl">{subtitle}</p>
      </div>
    </div>
  )
}

function TestimonialsComponent({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.length > 0 ? (
        items.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-md">
            <p className="mb-4">"{item.text}"</p>
            <p className="font-semibold">- {item.author}</p>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-400 py-8">No testimonials added</div>
      )}
    </div>
  )
}

function FAQComponent({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        items.map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-md">
            <h4 className="font-semibold mb-2">{item.question}</h4>
            <p className="text-gray-600">{item.answer}</p>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-400 py-8">No FAQ items added</div>
      )}
    </div>
  )
}

function SocialIconsComponent({ platforms, size }: { platforms: string[]; size: string }) {
  const iconSize = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <div className="flex items-center space-x-4">
      {platforms.map((platform) => (
        <a key={platform} href="#" className={`${iconSize} text-gray-600 hover:text-[#ff6b35]`}>
          {platform}
        </a>
      ))}
    </div>
  )
}

