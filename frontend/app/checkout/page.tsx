'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartAPI, orderAPI } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { FiCheckCircle } from 'react-icons/fi'

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { items, total } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    postal_code: '',
    country: '',
    coupon_code: '',
  })
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (items.length === 0) {
      router.push('/cart')
      return
    }
  }, [user, items, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const orderData = {
        ...formData,
        coupon_code: appliedCoupon || formData.coupon_code || undefined,
      }
      const response = await orderAPI.createOrder(orderData)
      useCartStore.getState().clearCart()
      router.push(`/orders/${response.data.order.id}`)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCoupon = async () => {
    if (!formData.coupon_code) return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api'}/coupons/validate?code=${formData.coupon_code}`)
      const data = await response.json()
      if (data.valid && data.coupon) {
        const coupon = data.coupon
        let discount = 0
        if (coupon.type === 'percentage') {
          discount = total * (coupon.value / 100)
          if (coupon.max_discount > 0 && discount > coupon.max_discount) {
            discount = coupon.max_discount
          }
        } else {
          discount = coupon.value
        }
        setCouponDiscount(discount)
        setAppliedCoupon(formData.coupon_code)
        alert(`Coupon applied! Discount: ৳${discount.toFixed(2)}`)
      } else {
        alert('Invalid coupon code')
      }
    } catch (error) {
      alert('Failed to validate coupon')
    }
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-black">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-black">Shipping Information</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Address</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Postal Code</label>
                <input
                  type="text"
                  required
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  placeholder="10001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">Country</label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                placeholder="United States"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">Coupon Code (Optional)</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.coupon_code}
                  onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  placeholder="Enter coupon code"
                  disabled={!!appliedCoupon}
                />
                {!appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition"
                  >
                    Apply
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponDiscount(0)
                      setFormData({ ...formData, coupon_code: '' })
                    }}
                    className="px-4 py-2 bg-red-200 text-red-900 rounded-md hover:bg-red-300 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <p className="text-sm text-green-600 mt-2">Coupon "{appliedCoupon}" applied! Discount: ৳{couponDiscount.toFixed(2)}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff6b35] text-gray-900 py-3 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-black">Order Summary</h2>

          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-semibold text-black">{item.product.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-black">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-black">৳{total.toFixed(2)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-semibold">-৳{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-semibold text-black">Free</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t text-black">
              <span>Total</span>
              <span>৳{(total - couponDiscount).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-md flex items-start space-x-2">
            <FiCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-semibold">Secure Checkout</p>
              <p>Your payment information is safe and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

