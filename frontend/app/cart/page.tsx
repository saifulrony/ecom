'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartAPI, CartItem } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi'
import Image from 'next/image'
import Link from 'next/link'
import PageRenderer from '@/components/PageRenderer'
import { usePageBuilderPage } from '@/hooks/usePageBuilderPage'

export default function CartPage() {
  const { components: pageComponents, loading: pageLoading, hasPage } = usePageBuilderPage('cart')
  const router = useRouter()
  const { user } = useAuthStore()
  const { items, total, setCart } = useCartStore()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  // If page builder page exists, render it instead
  if (hasPage && !pageLoading) {
    return <PageRenderer components={pageComponents} />
  }

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchCart = async () => {
      try {
        const response = await cartAPI.getCart()
        setCart(response.data.items, response.data.total)
      } catch (error) {
        console.error('Failed to fetch cart:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCart()
  }, [user, router, setCart])

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return

    setUpdating(itemId)
    try {
      await cartAPI.updateCartItem(itemId, { quantity: newQuantity })
      const response = await cartAPI.getCart()
      setCart(response.data.items, response.data.total)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update cart')
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    setUpdating(itemId)
    try {
      await cartAPI.removeFromCart(itemId)
      const response = await cartAPI.getCart()
      setCart(response.data.items, response.data.total)
    } catch (error) {
      alert('Failed to remove item')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <FiShoppingBag className="mx-auto text-6xl text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-black">Your cart is empty</h2>
          <p className="text-gray-600 mb-6 text-black">Start shopping to add items to your cart</p>
          <Link
            href="/products"
            className="inline-block bg-[#ff6b35] text-gray-900 px-6 py-3 rounded-lg hover:bg-[#ff8c5a] transition font-semibold"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-black">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-4"
            >
              <div className="relative w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={item.product.image || '/placeholder.jpg'}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product.id}`}>
                  <h3 className="font-semibold text-lg text-black hover:text-primary-600 transition">
                    {item.product.name}
                  </h3>
                </Link>
                {item.variations && (
                  <div className="text-xs text-gray-500 mt-1">
                    {typeof item.variations === 'string' ? (
                      Object.entries(JSON.parse(item.variations)).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: <span className="font-medium text-gray-700">{value as string}</span>
                        </span>
                      ))
                    ) : (
                      Object.entries(item.variations).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: <span className="font-medium text-gray-700">{value as string}</span>
                        </span>
                      ))
                    )}
                  </div>
                )}
                <p className="text-primary-600 font-bold text-black">৳{item.product.price.toFixed(2)}</p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Quantity Controls */}
                <div className="flex items-center space-x-2 border rounded-md">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={updating === item.id || item.quantity <= 1}
                    className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiMinus />
                  </button>
                  <span className="px-3 py-2 min-w-[3rem] text-center text-black">
                    {updating === item.id ? '...' : item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={updating === item.id || item.quantity >= item.product.stock}
                    className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiPlus />
                  </button>
                </div>

                <div className="text-right min-w-[6rem]">
                  <p className="font-bold text-black">
                    ৳{(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={updating === item.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-6 text-black">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-black">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-black">Free</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-xl font-bold text-black">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-[#ff6b35] text-gray-900 text-center py-3 rounded-lg hover:bg-[#ff8c5a] transition font-semibold"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

