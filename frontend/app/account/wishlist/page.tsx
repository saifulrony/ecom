'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { wishlistAPI, cartAPI, Product } from '@/lib/api'
import { FiHeart, FiTrash2, FiShoppingCart } from 'react-icons/fi'

interface WishlistItem {
  id: number
  product_id: number
  product: Product
  created_at: string
}

export default function WishlistPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchWishlist = async () => {
      try {
        const response = await wishlistAPI.getWishlist()
        setWishlist(response.data.wishlist || [])
      } catch (error) {
        console.error('Failed to fetch wishlist:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWishlist()
  }, [user, router])

  const handleRemove = async (productId: number) => {
    if (!confirm('Remove this item from wishlist?')) return
    
    try {
      await wishlistAPI.removeFromWishlist(productId)
      setWishlist(wishlist.filter((item) => item.product_id !== productId))
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove from wishlist')
    }
  }

  const handleAddToCart = async (productId: number) => {
    try {
      await cartAPI.addToCart({ product_id: productId, quantity: 1 })
      alert('Added to cart!')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add to cart')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
        <p className="text-gray-600 mt-1">Your saved products</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FiHeart className="mx-auto text-6xl text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">Start adding products you love to your wishlist</p>
          <Link
            href="/products"
            className="inline-block bg-[#ff6b35] text-gray-900 px-6 py-3 rounded-lg hover:bg-[#ff8c5a] transition"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              <Link href={`/products/${item.product_id}`}>
                <div className="relative h-48 w-full bg-gray-100">
                  {item.product?.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <FiHeart className="w-12 h-12" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/products/${item.product_id}`}>
                  <h3 className="font-semibold text-gray-900 mb-2 hover:text-[#ff6b35] transition">
                    {item.product?.name || 'Product'}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-[#ff6b35] mb-4">
                  ৳{item.product?.price?.toFixed(2) || '0.00'}
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAddToCart(item.product_id)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-[#ff6b35] text-gray-900 px-4 py-2 rounded-lg hover:bg-[#ff8c5a] transition"
                  >
                    <FiShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={() => handleRemove(item.product_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

