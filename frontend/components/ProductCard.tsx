'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product, wishlistAPI } from '@/lib/api'
import { FiShoppingCart, FiHeart } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { cartAPI } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuthStore()
  const { setCart } = useCartStore()
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      alert('Please login to add items to cart')
      return
    }

    setIsAdding(true)
    try {
      await cartAPI.addToCart({ product_id: product.id, quantity: 1 })
      // Refresh cart
      const response = await cartAPI.getCart()
      setCart(response.data.items, response.data.total)
      alert('Added to cart!')
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
    <div className="bg-[#2a2a2a] rounded-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-700 hover:border-[#ff6b35] group">
      <Link href={`/products/${product.id}`}>
        <div className="relative h-64 w-full bg-[#1a1a1a] overflow-hidden">
          {imageError || !product.image ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <svg className="w-24 h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : product.image.startsWith('http') ? (
            // Use regular img for external URLs to handle errors properly
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          )}
          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            disabled={isWishlistLoading}
            className="absolute top-3 right-3 p-2 bg-[#1a1a1a]/80 backdrop-blur-sm rounded-full text-gray-200 hover:bg-[#ff6b35] transition z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <FiHeart className={`w-4 h-4 ${isWishlisted ? 'fill-[#ff6b35] text-[#ff6b35]' : ''}`} />
          </button>
          {/* Stock Badge */}
          {product.stock === 0 && (
            <div className="absolute top-3 left-3 bg-red-200 text-red-900 px-3 py-1 rounded text-xs font-semibold">
              Out of Stock
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold mb-2 text-gray-200 hover:text-[#ff6b35] transition line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-[#ff6b35]">
            ৳{product.price.toFixed(2)}
          </span>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isAdding || product.stock === 0}
          className="w-full bg-[#ff6b35] text-gray-900 px-4 py-3 rounded-md hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold uppercase tracking-wide"
        >
          <FiShoppingCart />
          <span>{isAdding ? 'Adding...' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  )
}
