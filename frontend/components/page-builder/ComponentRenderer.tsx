'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Component } from './types'
import Image from 'next/image'
import Link from 'next/link'
import { productAPI } from '@/lib/api'
import { GridComponentRenderer } from './GridComponent'
import { ColumnComponentRenderer } from './ColumnComponent'
import ProductCard from '@/components/ProductCard'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

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

// Helper function to get shadow style
const getShadowStyle = (shadow: string | undefined) => {
  const shadows: Record<string, string> = {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  }
  return shadows[shadow || 'none'] || shadows.none
}

// Helper function to get gradient background
const getGradientBackground = (gradient: string | undefined, fallback: string) => {
  if (!gradient || gradient === 'none') return fallback
  
  const gradients: Record<string, string> = {
    'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'gradient-warm': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'gradient-cool': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'gradient-sunset': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'gradient-ocean': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'gradient-forest': 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'gradient-orange': 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    'gradient-dark': 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
  }
  
  if (gradients[gradient]) {
    return gradients[gradient]
  }
  
  // Check if it's a custom gradient (starts with linear-gradient or radial-gradient)
  if (gradient.startsWith('linear-gradient') || gradient.startsWith('radial-gradient')) {
    return gradient
  }
  
  return fallback
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
        const headingGradient = component.props?.gradient
        const headingColor = component.props?.color || '#000000'
        
        return (
          <HeadingTag
            style={{
              background: headingGradient && headingGradient !== 'none' 
                ? getGradientBackground(headingGradient, headingColor)
                : headingColor,
              WebkitBackgroundClip: headingGradient && headingGradient !== 'none' ? 'text' : undefined,
              WebkitTextFillColor: headingGradient && headingGradient !== 'none' ? 'transparent' : undefined,
              backgroundClip: headingGradient && headingGradient !== 'none' ? 'text' : undefined,
              color: headingGradient && headingGradient !== 'none' ? undefined : headingColor,
              fontSize: component.props?.fontSize || '2.5rem',
              textAlign: component.props?.align || 'left',
              fontWeight: component.props?.fontWeight || 'bold',
              letterSpacing: component.props?.letterSpacing || 'normal',
              lineHeight: component.props?.lineHeight || '1.2',
              textShadow: component.props?.textShadow || 'none',
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
              fontWeight: component.props?.fontWeight || 'normal',
              letterSpacing: component.props?.letterSpacing || 'normal',
              ...baseStyle,
            }}
            className={component.className}
            dangerouslySetInnerHTML={{ __html: component.props?.text || component.content || '' }}
          />
        )

      case 'button':
        const buttonBg = component.props?.variant === 'primary' ? '#ff6b35' : (component.props?.bgColor || '#f3f4f6')
        const buttonGradient = component.props?.gradient
        const buttonShadow = getShadowStyle(component.props?.shadow)
        const buttonHover = component.props?.hoverEffect || 'none'
        
        const ButtonContent = (
          <button
            style={{
              background: buttonGradient && buttonGradient !== 'none'
                ? getGradientBackground(buttonGradient, buttonBg)
                : buttonBg,
              color: component.props?.variant === 'primary' || (buttonGradient && buttonGradient !== 'none') ? '#ffffff' : (component.props?.color || '#000000'),
              padding: component.props?.size === 'lg' ? '14px 28px' : component.props?.size === 'sm' ? '8px 16px' : '10px 20px',
              borderRadius: component.props?.radius || (component.props?.rounded ? '9999px' : '8px'),
              border: component.props?.variant === 'outline' ? `2px solid ${component.props.borderColor || '#ff6b35'}` : component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
              fontSize: component.props?.fontSize || '1rem',
              fontWeight: component.props?.fontWeight || '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: buttonShadow,
              transform: 'translateY(0)',
              ...baseStyle,
            }}
            className={component.className}
            onMouseEnter={(e) => {
              if (buttonHover === 'lift') {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = getShadowStyle('lg')
              } else if (buttonHover === 'glow') {
                const glowColor = buttonGradient && buttonGradient !== 'none' ? '#ff6b35' : (component.props?.bgColor || '#ff6b35')
                e.currentTarget.style.boxShadow = `0 0 20px ${glowColor}40`
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = buttonShadow
            }}
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
        const imageShadow = getShadowStyle(component.props?.shadow)
        const imageRadius = component.props?.radius || '0'
        const imageHover = component.props?.hoverEffect || 'none'
        
        return (
          <div style={{ textAlign: component.props?.align || 'left', ...baseStyle }}>
            {component.props?.src ? (
              <div
                style={{
                  display: 'inline-block',
                  borderRadius: imageRadius,
                  overflow: 'hidden',
                  boxShadow: imageShadow,
                  transition: 'all 0.3s ease',
                }}
                className={imageHover === 'zoom' ? 'hover:scale-105' : imageHover === 'shadow' ? 'hover:shadow-xl' : ''}
              >
              <Image
                src={component.props.src}
                alt={component.props?.alt || 'Image'}
                width={component.props?.width === 'auto' ? 800 : parseInt(component.props?.width) || 800}
                height={component.props?.height === 'auto' ? 600 : parseInt(component.props?.height) || 600}
                className={component.className}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
              />
              </div>
            ) : (
              <div
                className="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300"
                style={{
                  width: component.props?.width || '100%',
                  height: component.props?.height || '300px',
                  minHeight: '200px',
                  borderRadius: imageRadius,
                }}
              >
                <span className="text-gray-400">No image selected</span>
              </div>
            )}
          </div>
        )

      case 'section':
        const sectionGradient = component.props?.gradient
        const sectionBg = component.props?.background || '#ffffff'
        const sectionShadow = getShadowStyle(component.props?.shadow)
        
        return (
          <section
            style={{
              padding: component.props?.padding || '40px',
              background: sectionGradient && sectionGradient !== 'none'
                ? getGradientBackground(sectionGradient, sectionBg)
                : sectionBg,
              textAlign: component.props?.align || 'center',
              borderRadius: component.props?.radius || '0',
              boxShadow: sectionShadow,
              border: component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
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
              borderRadius: component.props?.radius || '0',
              backgroundColor: component.props?.background || 'transparent',
              border: component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
              boxShadow: getShadowStyle(component.props?.shadow),
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
        const dividerStyle = component.props?.style || 'solid'
        return (
          <div
            style={{
              height: component.props?.thickness || '1px',
              backgroundColor: dividerStyle !== 'dashed' && dividerStyle !== 'dotted' ? (component.props?.color || '#e5e7eb') : 'transparent',
              borderTop: dividerStyle === 'dashed' || dividerStyle === 'dotted' 
                ? `${component.props?.thickness || '1px'} ${dividerStyle} ${component.props?.color || '#e5e7eb'}` 
                : 'none',
              margin: component.props?.margin || '20px 0',
              ...baseStyle,
            }}
            className={component.className}
          />
        )

      case 'card':
        const cardShadow = getShadowStyle(component.props?.shadow || 'md')
        const cardGradient = component.props?.gradient
        const cardBg = component.props?.background || '#ffffff'
        const cardHover = component.props?.hoverEffect || 'none'
        
        return (
          <div
            style={{
              padding: component.props?.padding || '24px',
              background: cardGradient && cardGradient !== 'none'
                ? getGradientBackground(cardGradient, cardBg)
                : cardBg,
              border: component.props?.border ? `1px solid ${component.props.borderColor || '#e5e7eb'}` : 'none',
              borderRadius: component.props?.radius || '12px',
              boxShadow: cardShadow,
              transition: 'all 0.3s ease',
              ...baseStyle,
            }}
            className={`${component.className || ''} ${
              cardHover === 'lift' ? 'hover:transform hover:-translate-y-2 hover:shadow-xl' :
              cardHover === 'glow' ? 'hover:shadow-2xl' :
              cardHover === 'scale' ? 'hover:scale-105' : ''
            }`}
          >
            {component.props?.title && (
              <h3 style={{
                marginBottom: '12px',
                fontSize: component.props?.titleSize || '1.25rem',
                fontWeight: component.props?.titleWeight || 'bold',
                color: cardGradient && cardGradient !== 'none' ? '#ffffff' : (component.props?.titleColor || 'inherit'),
              }}>
                {component.props.title}
              </h3>
            )}
            <div style={{
              color: cardGradient && cardGradient !== 'none' ? '#ffffff' : 'inherit',
            }}>
              {component.props?.content || 'Card content'}
            </div>
          </div>
        )

      case 'grid':
        return (
          <GridComponentRenderer
            component={component}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onUpdate={onUpdate}
            onAddToCell={(cellId, newComponent) => {
              if (component.children) {
                const updatedChildren = component.children.map((cell) => {
                  if (cell.id === cellId) {
                    return {
                      ...cell,
                      children: [...(cell.children || []), newComponent],
                    }
                  }
                  return cell
                })
                if (onUpdate) {
                  onUpdate({
                    ...component,
                    children: updatedChildren,
                  })
                }
              }
            }}
            previewMode={previewMode}
          />
        )

      case 'column':
        return (
          <ColumnComponentRenderer
            component={component}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            previewMode={previewMode}
          />
        )

      case 'video':
        return (
          <div style={{ ...baseStyle }} className={component.className}>
            {component.props?.src ? (
              <div
                style={{
                  borderRadius: component.props?.radius || '0',
                  overflow: 'hidden',
                  boxShadow: getShadowStyle(component.props?.shadow),
                }}
              >
              <iframe
                src={component.props.src}
                width={component.props?.width || '100%'}
                height={component.props?.height || '400px'}
                  style={{ border: 'none', display: 'block' }}
                allowFullScreen
              />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300" style={{ width: '100%', height: '400px', borderRadius: component.props?.radius || '0' }}>
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
            gradient={component.props?.gradient}
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
              backgroundColor: component.props?.bgColor || '#1a1a1a',
              color: component.props?.textColor || '#ffffff',
              padding: component.props?.padding || '20px',
              borderRadius: component.props?.radius || '8px',
              overflow: 'auto',
              boxShadow: getShadowStyle(component.props?.shadow),
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
              backgroundColor: component.props?.bgColor || colors.bg,
              borderLeft: `4px solid ${component.props?.borderColor || colors.border}`,
              color: component.props?.textColor || colors.text,
              padding: component.props?.padding || '12px 16px',
              borderRadius: component.props?.radius || '8px',
              boxShadow: getShadowStyle(component.props?.shadow),
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(limit || 8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg overflow-hidden h-96 animate-pulse shadow-sm border border-gray-200">
            <div className="h-64 bg-gray-200"></div>
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Use dynamic grid columns based on the columns prop
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  }
  const gridClass = gridCols[columns as keyof typeof gridCols] || gridCols[4]

  return (
    <div className={`grid ${gridClass} gap-6`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
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
      <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20 transition-all"
      />
        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  )
}

function ContactFormComponent({ title }: { title: string }) {
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-center">{title}</h3>
      <form className="space-y-4">
        <input 
          type="text" 
          placeholder="Name" 
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20 transition-all" 
        />
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20 transition-all" 
        />
        <textarea 
          placeholder="Message" 
          rows={4} 
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20 transition-all resize-none" 
        />
        <button 
          type="submit" 
          className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
        >
          Send Message
        </button>
      </form>
    </div>
  )
}

function NewsletterComponent({ title, placeholder }: { title: string; placeholder: string }) {
  return (
    <div className="max-w-md mx-auto text-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-600 mb-6">Stay updated with our latest news and offers</p>
      <div className="flex space-x-2">
        <input
          type="email"
          placeholder={placeholder}
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20 transition-all"
        />
        <button className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all">
          Subscribe
        </button>
      </div>
    </div>
  )
}

function SliderComponent({ items }: { items: Component[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Default slides if no items provided
  const defaultSlides: Component[] = [
    {
      id: 'default-slide-1',
      type: 'banner',
      props: {
        title: 'Welcome to Our Store',
        subtitle: 'Discover amazing products at unbeatable prices',
        height: '500px',
        gradient: 'gradient-orange',
      },
    },
    {
      id: 'default-slide-2',
      type: 'banner',
      props: {
        title: 'New Collection',
        subtitle: 'Shop the latest trends and styles',
        height: '500px',
        gradient: 'gradient-primary',
      },
    },
    {
      id: 'default-slide-3',
      type: 'banner',
      props: {
        title: 'Special Offers',
        subtitle: 'Limited time deals you don\'t want to miss',
        height: '500px',
        gradient: 'gradient-warm',
      },
    },
  ]

  const slides = items.length > 0 ? items : defaultSlides

  useEffect(() => {
    if (slides.length === 0 || isPaused) return

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length)
      }, 5000) // Auto-advance every 5 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [slides.length, isPlaying, isPaused])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsPaused(true)
    setIsPlaying(false)
    // Resume auto-play after 8 seconds
    setTimeout(() => {
      setIsPaused(false)
      setIsPlaying(true)
    }, 8000)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
    setIsPaused(true)
    setIsPlaying(false)
    setTimeout(() => {
      setIsPaused(false)
      setIsPlaying(true)
    }, 8000)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
    setIsPaused(true)
    setIsPlaying(false)
    setTimeout(() => {
      setIsPaused(false)
      setIsPlaying(true)
    }, 8000)
  }

  const handleMouseEnter = () => {
    setIsPaused(true)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  return (
    <div 
      ref={sliderRef}
      className="relative w-full overflow-hidden rounded-xl shadow-2xl group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slider Container with Slide Animation */}
      <div className="relative h-[400px] md:h-[600px] overflow-hidden">
        <div 
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            width: `${slides.length * 100}%`
          }}
        >
          {slides.map((item, index) => (
            <div
              key={item.id}
              className="w-full h-full flex-shrink-0"
              style={{ width: `${100 / slides.length}%` }}
            >
              <ComponentRenderer
                component={item}
                isSelected={false}
                isHovered={false}
                onClick={() => {}}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                previewMode={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Always visible but more subtle */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl backdrop-blur-sm border border-gray-200/50"
            aria-label="Previous slide"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl backdrop-blur-sm border border-gray-200/50"
            aria-label="Next slide"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Progress Bar */}
      {slides.length > 1 && isPlaying && !isPaused && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-30">
          <div 
            className="h-full bg-[#ff6b35] transition-all duration-100 ease-linear"
            style={{ 
              width: `${((currentIndex + 1) / slides.length) * 100}%`
            }}
          />
        </div>
      )}

      {/* Dots Indicator - Enhanced Design */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2.5 items-center bg-black/30 backdrop-blur-md px-4 py-2 rounded-full">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-3 h-3 bg-[#ff6b35] shadow-lg shadow-[#ff6b35]/50'
                  : 'w-2 h-2 bg-white/70 hover:bg-white hover:scale-125'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide Counter */}
      {slides.length > 1 && (
        <div className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full">
          {currentIndex + 1} / {slides.length}
        </div>
      )}
    </div>
  )
}

function BannerComponent({ title, subtitle, image, height, gradient }: { title: string; subtitle: string; image: string; height: string; gradient?: string }) {
  // Helper function to get gradient background (local copy)
  const getGradient = (grad: string | undefined, fallback: string) => {
    if (!grad || grad === 'none') return fallback
    const gradients: Record<string, string> = {
      'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'gradient-warm': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'gradient-cool': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'gradient-orange': 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    }
    return gradients[grad] || fallback
  }
  
  const background = image 
    ? `url(${image})` 
    : (gradient && gradient !== 'none' 
      ? getGradient(gradient, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
  
  return (
    <div
      className="relative rounded-lg flex items-center justify-center text-white overflow-hidden"
      style={{
        height,
        backgroundImage: background,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="text-center relative z-10 px-4">
        <h2 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">{title}</h2>
        <p className="text-xl md:text-2xl drop-shadow-md">{subtitle}</p>
      </div>
    </div>
  )
}

function TestimonialsComponent({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.length > 0 ? (
        items.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
            <div className="mb-4">
              <svg className="w-8 h-8 text-[#ff6b35]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.984zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
            </div>
            <p className="mb-4 text-gray-700 italic">"{item.text}"</p>
            <p className="font-semibold text-gray-900">- {item.author}</p>
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
          <div key={i} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <h4 className="font-bold text-lg mb-2 text-gray-900">{item.question}</h4>
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
  const iconSize = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  return (
    <div className="flex items-center justify-center space-x-4">
      {platforms.map((platform) => (
        <a 
          key={platform} 
          href="#" 
          className={`${iconSize} text-gray-600 hover:text-[#ff6b35] hover:scale-110 transition-all rounded-full bg-gray-100 hover:bg-[#ff6b35]/10 flex items-center justify-center`}
        >
          {platform.charAt(0).toUpperCase()}
        </a>
      ))}
    </div>
  )
}
