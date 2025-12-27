'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product, wishlistAPI, productAPI, ProductVariation } from '@/lib/api'
import { FiShoppingCart, FiHeart, FiEye, FiStar, FiCheck } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { cartAPI } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ProductCardProps {
  product: Product
  showCategory?: boolean
  showWishlist?: boolean
  showCartButton?: boolean
  showViewDetails?: boolean
  hideStockOut?: boolean
}

export default function ProductCard({ 
  product,
  showCategory = true,
  showWishlist = true,
  showCartButton = true,
  showViewDetails = false,
  hideStockOut = false
}: ProductCardProps) {
  const { user } = useAuthStore()
  const { setCart } = useCartStore()
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [showVariations, setShowVariations] = useState(false)
  const [loadingVariations, setLoadingVariations] = useState(false)

  useEffect(() => {
    const checkWishlist = async () => {
      if (user && product.id) {
        try {
          const response = await wishlistAPI.checkWishlist(product.id)
          setIsWishlisted(response.data.in_wishlist)
        } catch (error) {
          console.error('Failed to check wishlist:', error)
        }
      }
    }

    if (user) {
      checkWishlist()
    }
  }, [user, product.id])

  // Load variations if product has them
  useEffect(() => {
    const loadVariations = async () => {
      // Check if product already has variations loaded
      if (product.variations && product.variations.length > 0) {
        setVariations(product.variations)
        return
      }

      // Otherwise fetch them
      setLoadingVariations(true)
      try {
        const response = await productAPI.getProductVariations(product.id)
        if (response.data && response.data.length > 0) {
          setVariations(response.data)
        }
      } catch (error) {
        // Product might not have variations, that's okay
        console.log('No variations found for product:', product.id)
      } finally {
        setLoadingVariations(false)
      }
    }

    loadVariations()
  }, [product.id, product.variations])

  const calculatePrice = () => {
    let finalPrice = product.price
    if (variations.length > 0 && Object.keys(selectedVariations).length > 0) {
      variations.forEach((variation) => {
        const selectedValue = selectedVariations[variation.name]
        if (selectedValue && variation.options) {
          const option = variation.options.find(opt => opt.value === selectedValue)
          if (option) {
            finalPrice += option.price_modifier
          }
        }
      })
    }
    return finalPrice
  }

  const hasRequiredVariations = () => {
    if (variations.length === 0) return true
    return variations.every(variation => {
      if (variation.is_required) {
        return !!selectedVariations[variation.name]
      }
      return true
    })
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if variations are required
    if (variations.length > 0 && !hasRequiredVariations()) {
      setShowVariations(true)
      alert('Please select required options')
      return
    }

    setIsAdding(true)
    try {
      const variationsData = Object.keys(selectedVariations).length > 0 ? selectedVariations : undefined
      await cartAPI.addToCart({ 
        product_id: product.id, 
        quantity: 1,
        variations: variationsData
      })
      // Refresh cart
      const response = await cartAPI.getCart()
      setCart(response.data.items, response.data.total)
      alert('Added to cart!')
      // Reset variations after adding
      setSelectedVariations({})
      setShowVariations(false)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add to cart')
    } finally {
      setIsAdding(false)
    }
  }

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      router.push('/login')
      return
    }

    setIsWishlistLoading(true)
    try {
      if (isWishlisted) {
        await wishlistAPI.removeFromWishlist(product.id)
        setIsWishlisted(false)
      } else {
        await wishlistAPI.addToWishlist(product.id)
        setIsWishlisted(true)
      }
    } catch (error: any) {
      console.error('Failed to update wishlist:', error)
      alert(error.response?.data?.error || 'Failed to update wishlist')
    } finally {
      setIsWishlistLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 group relative flex flex-col h-full">
      {/* Image Container */}
      <Link href={`/products/${product.id}`} className="relative block">
        <div className="relative h-64 w-full bg-gray-50 overflow-hidden">
          {imageError || !product.image ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : product.image.startsWith('http') ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          
          {/* Stock Badge */}
          {product.stock === 0 && !hideStockOut && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
              Out of Stock
            </div>
          )}
          
          {/* Action Buttons - WoodMart Style */}
          {(showWishlist || showViewDetails) && (
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {showWishlist && (
                <button
                  onClick={handleWishlist}
                  disabled={isWishlistLoading}
                  className={`p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 ${
                    isWishlisted 
                      ? 'text-[#ff6b35]' 
                      : 'text-gray-600 hover:text-[#ff6b35]'
                  }`}
                  title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <FiHeart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              )}
              {showViewDetails && (
                <Link
                  href={`/products/${product.id}`}
                  className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 text-gray-600 hover:text-[#ff6b35]"
                  title="View Details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FiEye className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </Link>
      
      {/* Content - WoodMart Style */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category */}
        {showCategory && product.category && (
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
            {product.category.name}
          </div>
        )}
        
        {/* Product Name */}
        <Link href={`/products/${product.id}`}>
          <h3 className="text-base font-semibold mb-2 text-gray-900 hover:text-[#ff6b35] transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>
        
        {/* Variations */}
        {variations.length > 0 && (
          <div className="mb-3 space-y-2">
            {variations.slice(0, showVariations ? variations.length : 1).map((variation) => (
              <div key={variation.id}>
                <div className="text-xs text-gray-600 mb-1.5 font-medium">
                  {variation.name}
                  {variation.is_required && <span className="text-red-500 ml-1">*</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {variation.options && variation.options.slice(0, 4).map((option) => (
                    <button
                      key={option.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedVariations({
                          ...selectedVariations,
                          [variation.name]: option.value
                        })
                        setShowVariations(true)
                      }}
                      className={`px-2.5 py-1 text-xs rounded border transition-all ${
                        selectedVariations[variation.name] === option.value
                          ? 'bg-[#ff6b35] text-white border-[#ff6b35]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#ff6b35]'
                      }`}
                    >
                      {option.value}
                      {option.price_modifier > 0 && (
                        <span className="ml-1 text-[10px]">+৳{option.price_modifier}</span>
                      )}
                    </button>
                  ))}
                  {variation.options && variation.options.length > 4 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowVariations(!showVariations)
                      }}
                      className="px-2.5 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:border-[#ff6b35]"
                    >
                      +{variation.options.length - 4}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Price */}
        <div className="mt-auto mb-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${calculatePrice() !== product.price ? 'text-[#ff6b35]' : 'text-gray-900'}`}>
              ৳{calculatePrice().toFixed(2)}
            </span>
            {calculatePrice() !== product.price && (
              <span className="text-sm text-gray-500 line-through">
            ৳{product.price.toFixed(2)}
          </span>
            )}
          </div>
        </div>
        
        {/* Add to Cart Button - WoodMart Style */}
        {showCartButton && (
          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock === 0 || (variations.length > 0 && !hasRequiredVariations())}
            className="w-full bg-[#ff6b35] text-white px-4 py-2.5 rounded-md hover:bg-[#e55a2b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm shadow-sm hover:shadow-md"
          >
            {isAdding ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <FiShoppingCart className="w-4 h-4" />
                <span>
                  {product.stock === 0 
                    ? 'Out of Stock' 
                    : variations.length > 0 && !hasRequiredVariations()
                    ? 'Select Options'
                    : 'Add to Cart'}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
