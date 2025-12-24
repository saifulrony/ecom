'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productAPI, Product, wishlistAPI } from '@/lib/api'
import { FiShoppingCart, FiMinus, FiPlus, FiHeart } from 'react-icons/fi'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { cartAPI } from '@/lib/api'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [customVariations, setCustomVariations] = useState<Record<string, string>>({})
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productAPI.getProduct(Number(params.id))
        setProduct(response.data)
      } catch (error) {
        console.error('Failed to fetch product:', error)
      } finally {
        setLoading(false)
      }
    }

    const checkWishlist = async () => {
      if (user && params.id) {
        try {
          const response = await wishlistAPI.checkWishlist(Number(params.id))
          setIsInWishlist(response.data.in_wishlist)
        } catch (error) {
          console.error('Failed to check wishlist:', error)
        }
      }
    }

    if (params.id) {
      fetchProduct()
      if (user) {
        checkWishlist()
      }
    }
  }, [params.id, user])

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!product) return

    // Validate required variations
    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        if (variation.is_required) {
          if (!selectedVariations[variation.name] && !customVariations[variation.name]) {
            alert(`Please select ${variation.name}`)
            return
          }
        }
      }
    }

    // Merge selected and custom variations
    const allVariations: Record<string, string> = { ...selectedVariations }
    Object.keys(customVariations).forEach(key => {
      if (customVariations[key]) {
        allVariations[key] = customVariations[key]
      }
    })

    setIsAdding(true)
    try {
      await cartAPI.addToCart({ 
        product_id: product.id, 
        quantity,
        variations: Object.keys(allVariations).length > 0 ? allVariations : undefined
      })
      alert('Added to cart!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add to cart')
    } finally {
      setIsAdding(false)
    }
  }

  const calculatePrice = () => {
    if (!product) return product?.price || 0
    let finalPrice = product.price
    
    if (product.variations) {
      product.variations.forEach(variation => {
        const selectedValue = selectedVariations[variation.name] || customVariations[variation.name]
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

  const handleWishlist = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!product) return

    setIsWishlistLoading(true)
    try {
      if (isInWishlist) {
        await wishlistAPI.removeFromWishlist(product.id)
        setIsInWishlist(false)
      } else {
        await wishlistAPI.addToWishlist(product.id)
        setIsInWishlist(true)
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update wishlist')
    } finally {
      setIsWishlistLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-gray-500">Product not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative h-96 md:h-[500px] bg-gray-100 rounded-lg overflow-hidden group">
          <Image
            src={product.image || '/placeholder.jpg'}
            alt={product.name}
            fill
            className="object-cover"
          />
          {/* Wishlist Icon */}
          <button
            onClick={handleWishlist}
            disabled={isWishlistLoading}
            className={`absolute top-4 right-4 p-3 rounded-full transition-all z-10 ${
              isInWishlist
                ? 'bg-[#ff6b35] text-gray-900'
                : 'bg-white/90 hover:bg-white text-gray-700'
            } shadow-lg hover:shadow-xl`}
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <FiHeart className={`w-6 h-6 ${isInWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">{product.name}</h1>
          <p className="text-3xl font-bold text-[#ff6b35] mb-6">
            ৳{calculatePrice().toFixed(2)}
            {calculatePrice() !== product.price && (
              <span className="text-lg text-gray-500 line-through ml-2">৳{product.price.toFixed(2)}</span>
            )}
          </p>

          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Stock: <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}
              </span>
            </p>
          </div>

          {/* Product Variations */}
          {product.variations && product.variations.length > 0 && (
            <div className="mb-6 space-y-4">
              {product.variations.map((variation) => (
                <div key={variation.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {variation.name}
                    {variation.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {variation.allow_custom ? (
                    <div className="space-y-2">
                      {/* Predefined Options */}
                      {variation.options && variation.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {variation.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setSelectedVariations({ ...selectedVariations, [variation.name]: option.value })
                                setCustomVariations({ ...customVariations, [variation.name]: '' })
                              }}
                              className={`px-4 py-2 rounded-lg border-2 transition ${
                                selectedVariations[variation.name] === option.value
                                  ? 'border-[#ff6b35] bg-[#ff6b35] text-gray-900'
                                  : 'border-gray-300 text-gray-700 hover:border-[#ff6b35]'
                              }`}
                            >
                              {option.value}
                              {option.price_modifier > 0 && (
                                <span className="text-xs ml-1">(+৳{option.price_modifier})</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Custom Input */}
                      <div>
                        <input
                          type="text"
                          placeholder={`Enter custom ${variation.name.toLowerCase()}`}
                          value={customVariations[variation.name] || ''}
                          onChange={(e) => {
                            setCustomVariations({ ...customVariations, [variation.name]: e.target.value })
                            setSelectedVariations({ ...selectedVariations, [variation.name]: '' })
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {variation.options && variation.options.length > 0 ? (
                        variation.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariations({ ...selectedVariations, [variation.name]: option.value })
                            }}
                            className={`px-4 py-2 rounded-lg border-2 transition ${
                              selectedVariations[variation.name] === option.value
                                ? 'border-[#ff6b35] bg-[#ff6b35] text-gray-900'
                                : 'border-gray-300 text-gray-700 hover:border-[#ff6b35]'
                            }`}
                          >
                            {option.value}
                            {option.price_modifier > 0 && (
                              <span className="text-xs ml-1">(+৳{option.price_modifier})</span>
                            )}
                            {option.stock !== undefined && option.stock < 10 && (
                              <span className="text-xs ml-1 text-orange-600">({option.stock} left)</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No options available</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity === 1}
                className="p-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FiMinus />
              </button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="p-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <FiPlus />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock === 0}
            className="w-full bg-[#ff6b35] text-gray-900 py-3 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold"
          >
            <FiShoppingCart />
            <span>{isAdding ? 'Adding...' : 'Add to Cart'}</span>
          </button>

          {product.stock === 0 && (
            <p className="mt-4 text-red-500 text-center">This product is currently out of stock</p>
          )}
        </div>
      </div>
    </div>
  )
}

