'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cartAPI, orderAPI } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { FiCheckCircle, FiChevronDown, FiChevronUp, FiCreditCard, FiSearch } from 'react-icons/fi'
import PageRenderer from '@/components/PageRenderer'
import { usePageBuilderPage } from '@/hooks/usePageBuilderPage'

interface PaymentGateway {
  gateway: string
  is_active: boolean
  is_test_mode: boolean
}

// Common countries list
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh',
  'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'China', 'Colombia', 'Croatia', 'Denmark',
  'Egypt', 'Finland', 'France', 'Germany', 'Greece', 'Hong Kong', 'Hungary', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kenya',
  'Kuwait', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria',
  'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Vietnam'
].sort()

export default function CheckoutPage() {
  const { components: pageComponents, loading: pageLoading, hasPage } = usePageBuilderPage('checkout')
  const router = useRouter()
  const { user } = useAuthStore()

  // If page builder page exists, render it instead
  if (hasPage && !pageLoading) {
    return <PageRenderer components={pageComponents} />
  }
  const { items, total } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryDropdownRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    coupon_code: '',
  })
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [taxAmount, setTaxAmount] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([])
  const [selectedGateway, setSelectedGateway] = useState<string>('')
  const [defaultGateway, setDefaultGateway] = useState<string>('')
  const [gatewayLoading, setGatewayLoading] = useState(true)

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (items.length === 0) {
      router.push('/cart')
      return
    }

    // Pre-fill user data
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        postal_code: user.postal_code || '',
        country: user.country || '',
      }))
      if (user.country) {
        setCountrySearch(user.country)
      }
    }

    // Calculate subtotal
    const currentSubtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    setSubtotal(currentSubtotal)

    // Fetch payment gateways
    const fetchPaymentGateways = async () => {
      setGatewayLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:10000/api` : 'http://localhost:10000/api')
        console.log('Fetching payment gateways from:', `${apiUrl}/payment-gateways`)
        const response = await fetch(`${apiUrl}/payment-gateways`)
        console.log('Payment gateway response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('Payment gateway data:', data)
          const gateways = data.gateways || []
          setPaymentGateways(gateways)
          setDefaultGateway(data.default_gateway || '')
          if (gateways.length > 0) {
            setSelectedGateway(data.default_gateway || gateways[0].gateway)
          }
        } else {
          const errorText = await response.text()
          console.error('Failed to fetch payment gateways:', response.status, errorText)
        }
      } catch (error) {
        console.error('Failed to fetch payment gateways:', error)
      } finally {
        setGatewayLoading(false)
      }
    }

    fetchPaymentGateways()
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
      // Update state with actual breakdown from backend response
      setTaxAmount(response.data.order.tax_amount || 0)
      setCouponDiscount(response.data.order.discount_amount || 0)
      setShippingCost(response.data.order.shipping_cost || 0)
      setSubtotal(response.data.order.subtotal || 0)
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:10000/api` : 'http://localhost:10000/api')
      const response = await fetch(`${apiUrl}/coupons/validate?code=${formData.coupon_code}`)
      const data = await response.json()
      if (data.valid && data.coupon) {
        const coupon = data.coupon
        let discount = 0
        if (coupon.type === 'percentage') {
          discount = subtotal * (coupon.value / 100)
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

  const filteredCountries = COUNTRIES.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const handleCountrySelect = (country: string) => {
    setFormData({ ...formData, country })
    setCountrySearch(country)
    setShowCountryDropdown(false)
  }

  if (items.length === 0) {
    return null
  }

  const finalTotal = subtotal - couponDiscount + taxAmount + shippingCost

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-black">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-black">Shipping Information</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                placeholder="John Doe"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Phone <span className="text-red-500">*</span></label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                placeholder="+1234567890"
              />
            </div>

            {/* Address Field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Postal Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                  placeholder="10001"
                />
              </div>
            </div>

            {/* Country Field - Searchable Select */}
            <div className="relative" ref={countryDropdownRef}>
              <label className="block text-sm font-medium mb-2 text-black">Country <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value)
                    setShowCountryDropdown(true)
                    if (e.target.value && COUNTRIES.includes(e.target.value)) {
                      setFormData({ ...formData, country: e.target.value })
                    }
                  }}
                  onFocus={() => setShowCountryDropdown(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                  placeholder="Search and select country"
                />
                <FiSearch className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                {showCountryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((country) => (
                        <button
                          key={country}
                          type="button"
                          onClick={() => handleCountrySelect(country)}
                          className={`w-full text-left px-4 py-2 hover:bg-[#ff6b35] hover:text-white transition-colors ${
                            formData.country === country ? 'bg-[#ff6b35] text-white' : 'text-black'
                          }`}
                        >
                          {country}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No countries found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Gateway Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-black">
                Payment Method <span className="text-red-500">*</span>
              </label>
              {gatewayLoading ? (
                <div className="text-gray-500 text-sm">Loading payment methods...</div>
              ) : paymentGateways.length > 0 ? (
                <div className="space-y-2">
                  {paymentGateways.map((gateway) => (
                    <label
                      key={gateway.gateway}
                      className={`flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedGateway === gateway.gateway
                          ? 'border-[#ff6b35] bg-[#ff6b35]/10'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_gateway"
                        value={gateway.gateway}
                        checked={selectedGateway === gateway.gateway}
                        onChange={(e) => setSelectedGateway(e.target.value)}
                        className="w-4 h-4 text-[#ff6b35] focus:ring-[#ff6b35]"
                      />
                      <FiCreditCard className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-black capitalize">
                        {gateway.gateway}
                        {gateway.is_test_mode && (
                          <span className="ml-2 text-xs text-orange-600">(Test Mode)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No payment methods available. Please contact support or configure payment gateways in admin panel.
                  </p>
                </div>
              )}
            </div>

            {/* Collapsible Coupon Section */}
            <div className="border border-gray-300 rounded-lg">
              <button
                type="button"
                onClick={() => setShowCoupon(!showCoupon)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-black">Have a coupon code?</span>
                {showCoupon ? (
                  <FiChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              {showCoupon && (
                <div className="px-4 pb-4 border-t border-gray-300 pt-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.coupon_code}
                      onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-black"
                      placeholder="Enter coupon code"
                      disabled={!!appliedCoupon}
                    />
                    {!appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-[#ff6b35] text-white rounded-md hover:bg-[#e55a2b] transition"
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
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="text-sm text-green-600 mt-2">Coupon "{appliedCoupon}" applied! Discount: ৳{couponDiscount.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !selectedGateway}
              className="w-full bg-[#ff6b35] text-white py-3 rounded-lg hover:bg-[#e55a2b] transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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
                  ৳{(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-black">৳{subtotal.toFixed(2)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-semibold">-৳{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold text-black">৳{taxAmount.toFixed(2)}</span>
              </div>
            )}
            {shippingCost > 0 ? (
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-black">৳{shippingCost.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-black">Free</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t text-black">
              <span>Total</span>
              <span>৳{finalTotal.toFixed(2)}</span>
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
