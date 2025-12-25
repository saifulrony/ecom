'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productAPI, Product, wishlistAPI } from '@/lib/api'
import { FiShoppingCart, FiMinus, FiPlus, FiHeart, FiStar, FiPackage, FiTag, FiInfo } from 'react-icons/fi'
import Image from 'next/image'
import { useAuthStore } from '@/store/authStore'
import { cartAPI } from '@/lib/api'
import PageRenderer from '@/components/PageRenderer'
import { usePageBuilderPage } from '@/hooks/usePageBuilderPage'

interface Review {
  id: number
  user_id: number
  user: {
    id: number
    name: string
    email: string
    image?: string
  }
  rating: number
  title?: string
  comment?: string
  created_at: string
}

interface ReviewsData {
  reviews: Review[]
  average_rating: number
  total_reviews: number
}

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
  const [reviews, setReviews] = useState<ReviewsData | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'additional' | 'reviews'>('description')

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

    const fetchReviews = async () => {
      try {
        const response = await productAPI.getProductReviews(Number(params.id))
        setReviews(response.data)
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setReviewsLoading(false)
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
      fetchReviews()
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

  const handleSubmitReview = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!product) return

    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      alert('Please select a rating between 1 and 5')
      return
    }

    setSubmittingReview(true)
    try {
      await productAPI.createReview(product.id, {
        rating: reviewForm.rating,
        title: reviewForm.title || undefined,
        comment: reviewForm.comment || undefined,
      })
      alert('Review submitted successfully! It will be visible after admin approval.')
      setReviewForm({ rating: 5, title: '', comment: '' })
      // Refresh reviews
      const response = await productAPI.getProductReviews(product.id)
      setReviews(response.data)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
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
          <h1 className="text-4xl font-bold mb-3 text-gray-900">{product.name}</h1>
          
          {/* Rating and Reviews - Inline with title */}
          <div className="mb-4 flex items-center space-x-2">
            {reviews && reviews.total_reviews > 0 ? (
              <>
                <div className="flex items-center space-x-1">
                  {renderStars(Math.round(reviews.average_rating))}
                </div>
                <span className="text-sm text-gray-600">
                  Rated <strong>{reviews.average_rating.toFixed(2)}</strong> out of 5 based on{' '}
                  <strong>{reviews.total_reviews}</strong> {reviews.total_reviews === 1 ? 'customer rating' : 'customer ratings'}
                </span>
                <span className="text-sm text-gray-500">
                  ({reviews.total_reviews} {reviews.total_reviews === 1 ? 'customer review' : 'customer reviews'})
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500">No ratings yet</span>
            )}
          </div>

          {/* Price */}
          <p className="text-3xl font-bold text-[#ff6b35] mb-4">
            ৳{calculatePrice().toFixed(2)}
            {calculatePrice() !== product.price && (
              <span className="text-lg text-gray-500 line-through ml-2">৳{product.price.toFixed(2)}</span>
            )}
          </p>

          {/* Stock Status */}
          <div className="mb-6">
            {product.stock > 0 ? (
              <span className="text-green-600 font-medium">In Stock</span>
            ) : (
              <span className="text-red-600 font-medium">Out of stock</span>
            )}
          </div>

          {/* Product Variations - Table Format */}
          {product.variations && product.variations.length > 0 && (
            <div className="mb-6">
              <table className="w-full border-collapse">
                <tbody>
              {product.variations.map((variation) => (
                    <tr key={variation.id} className="border-b border-gray-200">
                      <td className="py-3 pr-4 font-medium text-gray-900 align-top">
                    {variation.name}
                    {variation.is_required && <span className="text-red-500 ml-1">*</span>}
                      </td>
                      <td className="py-3">
                  {variation.allow_custom ? (
                    <div className="space-y-2">
                      {/* Predefined Options */}
                      {variation.options && variation.options.length > 0 && (
                              <select
                                value={selectedVariations[variation.name] || ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setSelectedVariations({ ...selectedVariations, [variation.name]: e.target.value })
                                setCustomVariations({ ...customVariations, [variation.name]: '' })
                                  }
                              }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                              >
                                <option value="">Choose an option</option>
                                {variation.options.map((option) => (
                                  <option key={option.id} value={option.value}>
                              {option.value}
                                    {option.price_modifier > 0 && ` (+৳${option.price_modifier})`}
                                  </option>
                          ))}
                              </select>
                      )}
                      {/* Custom Input */}
                        <input
                          type="text"
                          placeholder={`Enter custom ${variation.name.toLowerCase()}`}
                          value={customVariations[variation.name] || ''}
                          onChange={(e) => {
                            setCustomVariations({ ...customVariations, [variation.name]: e.target.value })
                            setSelectedVariations({ ...selectedVariations, [variation.name]: '' })
                          }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                        />
                    </div>
                  ) : (
                          <select
                            value={selectedVariations[variation.name] || ''}
                            onChange={(e) => {
                              setSelectedVariations({ ...selectedVariations, [variation.name]: e.target.value })
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                          >
                            <option value="">Choose an option</option>
                            {variation.options && variation.options.length > 0 && variation.options.map((option) => (
                              <option key={option.id} value={option.value}>
                            {option.value}
                                {option.price_modifier > 0 && ` (+৳${option.price_modifier})`}
                                {option.stock !== undefined && option.stock < 10 && ` (${option.stock} left)`}
                              </option>
                            ))}
                          </select>
                      )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-900">GalaxyBook Cosmos quantity</label>
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
            className="w-full bg-[#ff6b35] text-gray-900 py-3 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold mb-4"
          >
            <FiShoppingCart />
            <span>{isAdding ? 'Adding...' : 'Add to cart'}</span>
          </button>

          {/* Categories */}
          {product.category && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Categories:</span>{' '}
              <span className="text-[#ff6b35] hover:underline cursor-pointer">{product.category.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-12">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'description'
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'additional'
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Additional information
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reviews'
                  ? 'border-[#ff6b35] text-[#ff6b35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reviews {reviews && reviews.total_reviews > 0 && `(${reviews.total_reviews})`}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {/* Description Tab */}
          {activeTab === 'description' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              {product.description ? (
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              ) : (
                <p className="text-gray-500">No description available.</p>
              )}
            </div>
          )}

          {/* Additional Information Tab */}
          {activeTab === 'additional' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Additional information</h2>
              <table className="w-full border-collapse">
                <tbody>
                  {product.sku && (
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-8 font-medium text-gray-900 w-1/3">SKU</td>
                      <td className="py-3 text-gray-700">{product.sku}</td>
                    </tr>
                  )}
                  {product.category && (
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-8 font-medium text-gray-900 w-1/3">Category</td>
                      <td className="py-3 text-gray-700">{product.category.name}</td>
                    </tr>
                  )}
                  {product.variations && product.variations.length > 0 && (
                    <tr className="border-b border-gray-200">
                      <td className="py-3 pr-8 font-medium text-gray-900 w-1/3 align-top">Specifications</td>
                      <td className="py-3 text-gray-700">
                        {product.variations.map((variation, idx) => (
                          <div key={variation.id} className={idx > 0 ? 'mt-2' : ''}>
                            {variation.options && variation.options.length > 0 && (
                              <div>
                                {variation.options.map((option, optIdx) => (
                                  <span key={option.id}>
                                    {option.value}
                                    {optIdx < variation.options.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {reviews && reviews.total_reviews > 0
                  ? `${reviews.total_reviews} ${reviews.total_reviews === 1 ? 'review' : 'reviews'} for ${product.name}`
                  : `Reviews for ${product.name}`}
              </h2>

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-gray-500">Loading reviews...</div>
                </div>
              ) : reviews && reviews.reviews.length > 0 ? (
                <div className="space-y-6 mb-8">
                  {reviews.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {review.user.image ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                              <Image
                                src={review.user.image.startsWith('http') ? review.user.image : `http://192.168.10.203:10000${review.user.image}`}
                                alt={review.user.name}
                                width={40}
                                height={40}
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center">
                              <span className="text-gray-900 font-semibold text-sm">
                                {review.user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{review.user.name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">Rated</span>
                          <div className="flex items-center">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{review.rating}</span>
                          <span className="text-sm text-gray-500">out of 5</span>
                        </div>
                      </div>
                      {review.title && (
                        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No reviews yet.</p>
                </div>
              )}

              {/* Review Form */}
              {user ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add a review</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your rating <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Rate…</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="focus:outline-none"
                          >
                            <FiStar
                              className={`w-6 h-6 ${
                                star <= reviewForm.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              } hover:text-yellow-400 transition`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                        placeholder="Brief summary of your review"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white mb-4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your review <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Share your experience with this product"
                        rows={6}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={user.name}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Your email address will not be published. Required fields are marked <span className="text-red-500">*</span>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewForm.comment.trim() || reviewForm.rating < 1}
                        className="px-6 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit'}
                      </button>
                      <button
                        onClick={() => {
                          setReviewForm({ rating: 5, title: '', comment: '' })
                        }}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Cancel reply
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                  <p className="text-gray-600 mb-4">You must be logged in to post a review.</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a] transition font-medium"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

