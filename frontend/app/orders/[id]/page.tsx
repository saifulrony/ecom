'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { orderAPI, Order } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Image from 'next/image'
import { FiArrowLeft, FiPackage, FiMapPin } from 'react-icons/fi'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchOrder = async () => {
      try {
        const response = await orderAPI.getOrder(Number(params.id))
        setOrder(response.data)
      } catch (error) {
        console.error('Failed to fetch order:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchOrder()
    }
  }, [params.id, user, router])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-gray-500">Order not found</p>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/orders"
        className="inline-flex items-center space-x-2 text-[#ff6b35] hover:text-[#ff8c5a] mb-6"
      >
        <FiArrowLeft />
        <span>Back to Orders</span>
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order #{order.id}</h1>
            <p className="text-gray-600">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              order.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : order.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : order.status === 'processing'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiMapPin />
              <span>Shipping Address</span>
            </h3>
            <p className="text-gray-600">
              {order.address}
              <br />
              {order.city}, {order.postal_code}
              <br />
              {order.country}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiPackage />
              <span>Order Summary</span>
            </h3>
            <div className="space-y-2 text-gray-600">
              <p>Items: {order.items.length}</p>
              {order.subtotal !== undefined && (
                <div className="space-y-1 pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">৳{order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount !== undefined && order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-৳{order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.tax !== undefined && order.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax {order.tax_rate ? `(${order.tax_rate.toFixed(2)}%)` : ''}:</span>
                      <span className="font-semibold">৳{order.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {order.shipping !== undefined && (
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span className="font-semibold">
                        {order.shipping > 0 ? `৳${order.shipping.toFixed(2)}` : 'Free'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-[#ff6b35] pt-2 border-t border-gray-200">
                    <span>Total:</span>
                    <span>৳{order.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {order.subtotal === undefined && (
                <p className="text-xl font-bold text-[#ff6b35] pt-2">
                  Total: ৳{order.total.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-4 border-b border-gray-200 pb-4 last:border-0"
            >
              <div className="relative w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={item.product.image || '/placeholder.jpg'}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">৳{item.price.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  Total: ৳{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

