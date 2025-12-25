import axios from 'axios'

// Use environment variable or detect the correct API URL
const getAPIUrl = () => {
  // Check environment variable first (set in .env.local)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  if (typeof window !== 'undefined') {
    // Client-side: use current hostname
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:10000/api'
    }
    // Use the same hostname but port 10000 for API
    return `http://${hostname}:10000/api`
  }
  // Server-side: default to localhost
  return 'http://localhost:10000/api'
}

const API_URL = getAPIUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle response errors - only logout on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle rate limiting (429) with retry logic
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 1
      const delay = parseInt(retryAfter) * 1000 || 1000
      
      // Wait before retrying (only retry once)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Retry the original request once
      try {
        return await api.request(error.config)
      } catch (retryError) {
        // If retry fails, show user-friendly message
        if (typeof window !== 'undefined') {
          console.warn('Rate limit exceeded. Please wait a moment and refresh the page.')
        }
        return Promise.reject(retryError)
      }
    }
    
    // Only logout on 401 Unauthorized, not on other errors
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear auth and redirect to login
      localStorage.removeItem('token')
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login'
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface VariationOption {
  id: number
  variation_id: number
  value: string
  price_modifier: number
  stock: number
}

export interface ProductVariation {
  id: number
  product_id: number
  name: string
  is_required: boolean
  allow_custom: boolean
  options?: VariationOption[]
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  image: string
  images?: string | string[]
  display_type?: 'single' | 'slider' | 'gallery'
  sku?: string
  stock: number
  pos_stock?: number
  category_id: number
  category?: Category
  variations?: ProductVariation[]
  created_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  image?: string
}

export interface CartItem {
  id: number
  user_id: number
  product_id: number
  quantity: number
  product: Product
}

export interface Order {
  id: number
  user_id: number
  subtotal?: number
  tax?: number
  discount?: number
  shipping?: number
  tax_rate?: number
  total: number
  status: string
  address: string
  city: string
  postal_code: string
  country: string
  created_at: string
  items: OrderItem[]
  user?: {
    id: number
    name: string
    email: string
  }
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  price: number
  product: Product
}

// Auth APIs
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: FormData | { name?: string; email?: string; phone?: string; address?: string; city?: string; postal_code?: string; country?: string }) => {
    if (data instanceof FormData) {
      // Don't set Content-Type header manually - let browser set it with boundary
      return api.put('/auth/profile', data)
    }
    return api.put('/auth/profile', data)
  },
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/change-password', data),
}

// Product APIs
export const productAPI = {
  getProducts: (params?: { page?: number; limit?: number; category_id?: number; search?: string }) =>
    api.get('/products', { params }),
  getProduct: (id: number) => api.get(`/products/${id}`),
  getCategories: () => api.get('/categories'),
  getProductVariations: (id: number) => api.get(`/products/${id}/variations`),
  getShippingMethods: () => api.get('/shipping-methods'),
  getProductReviews: (id: number, params?: { rating?: number }) => api.get(`/products/${id}/reviews`, { params }),
  createReview: (productId: number, data: { rating: number; title?: string; comment?: string; order_id?: number }) =>
    api.post(`/products/${productId}/reviews`, data),
  getRefunds: () => api.get('/refunds'),
  createRefundRequest: (data: { order_id: number; order_item_id?: number; amount: number; reason: string }) =>
    api.post('/refunds', data),
}

// Cart APIs
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data: { product_id: number; quantity: number; variations?: Record<string, string> }) =>
    api.post('/cart', data),
  updateCartItem: (id: number, data: { quantity: number }) =>
    api.put(`/cart/${id}`, data),
  removeFromCart: (id: number) => api.delete(`/cart/${id}`),
  clearCart: () => api.delete('/cart'),
}

// Order APIs
export const orderAPI = {
  createOrder: (data: {
    address: string
    city: string
    postal_code: string
    country: string
    coupon_code?: string
  }) => api.post('/orders', data),
  getOrders: () => api.get('/orders'),
  getOrder: (id: number) => api.get(`/orders/${id}`),
}

// Wishlist APIs
export const wishlistAPI = {
  getWishlist: () => api.get('/wishlist'),
  addToWishlist: (productId: number) => api.post('/wishlist', { product_id: productId }),
  removeFromWishlist: (productId: number) => api.delete(`/wishlist/${productId}`),
  checkWishlist: (productId: number) => api.get(`/wishlist/check/${productId}`),
}

// Admin APIs
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getRecentOrders: () => api.get('/admin/dashboard/recent-orders'),
  getTopProducts: () => api.get('/admin/dashboard/top-products'),
  getSalesChartData: (days?: number) => api.get('/admin/dashboard/sales-chart', { params: days ? { days } : {} }),
  getOrdersChartData: (days?: number) => api.get('/admin/dashboard/orders-chart', { params: days ? { days } : {} }),
  getStatusChartData: () => api.get('/admin/dashboard/status-chart'),
  getLowStockProducts: () => api.get('/admin/dashboard/low-stock'),
  getUsers: () => api.get('/admin/users'),
  getAdminOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id: number, status: string) => api.put(`/admin/orders/${id}/status`, { status }),
  updateOrder: (id: number, data: { address?: string; city?: string; postal_code?: string; country?: string; notes?: string }) => 
    api.put(`/admin/orders/${id}`, data),
  createProduct: (data: any) => api.post('/admin/products', data),
  updateProduct: (id: number, data: any) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/admin/products/${id}`),
  createCategory: (data: { name: string; slug: string; image?: string }) => api.post('/admin/categories', data),
  updateCategory: (id: number, data: { name?: string; slug?: string; image?: string }) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data: any) => api.post('/admin/coupons', data),
  updateCoupon: (id: number, data: any) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: number) => api.delete(`/admin/coupons/${id}`),
  adjustStock: (id: number, data: { quantity: number; reason: string }) => api.put(`/admin/products/${id}/stock`, data),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getNotifications: (params?: { read?: string }) => api.get('/admin/notifications', { params }),
  createNotification: (data: any) => api.post('/admin/notifications', data),
  markNotificationAsRead: (id: number) => api.put(`/admin/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.put('/admin/notifications/read-all'),
  deleteNotification: (id: number) => api.delete(`/admin/notifications/${id}`),
  exportOrdersCSV: (params?: { from?: string; to?: string; status?: string }) => 
    api.get('/admin/orders/export/csv', { params, responseType: 'blob' }),
  exportOrdersPDF: (params?: { from?: string; to?: string; status?: string }) => 
    api.get('/admin/orders/export/pdf', { params, responseType: 'blob' }),
  generateInvoice: (id: number) => api.get(`/admin/orders/${id}/invoice`, { responseType: 'blob' }),
  bulkDeleteProducts: (ids: number[]) => api.post('/admin/products/bulk-delete', { ids }),
  bulkUpdateProductStatus: (ids: number[], status: string) => 
    api.put('/admin/products/bulk-update', { ids, status }),
  bulkUpdateOrderStatus: (ids: number[], status: string) => 
    api.put('/admin/orders/bulk-update', { ids, status }),
  getProductVariations: (productId: number) => api.get(`/admin/products/${productId}/variations`),
  createProductVariation: (productId: number, data: any) => api.post(`/admin/products/${productId}/variations`, data),
  updateProductVariation: (variationId: number, data: any) => api.put(`/admin/variations/${variationId}`, data),
  deleteProductVariation: (variationId: number) => api.delete(`/admin/variations/${variationId}`),
  createVariationOption: (variationId: number, data: any) => api.post(`/admin/variations/${variationId}/options`, data),
  updateVariationOption: (variationId: number, optionId: number, data: any) => api.put(`/admin/variations/${variationId}/options/${optionId}`, data),
  deleteVariationOption: (variationId: number, optionId: number) => api.delete(`/admin/variations/${variationId}/options/${optionId}`),
  // Reviews
  getReviews: (params?: { status?: string; product_id?: number }) => api.get('/admin/reviews', { params }),
  approveReview: (id: number) => api.put(`/admin/reviews/${id}/approve`),
  deleteReview: (id: number) => api.delete(`/admin/reviews/${id}`),
  // Shipping
  getShippingMethods: () => api.get('/admin/shipping-methods'),
  createShippingMethod: (data: any) => api.post('/admin/shipping-methods', data),
  updateShippingMethod: (id: number, data: any) => api.put(`/admin/shipping-methods/${id}`, data),
  // Theme Customization
  getAllCustomizations: () => api.get('/admin/customization'),
  getCustomization: (key: string) => api.get(`/admin/customization/${key}`),
  updateCustomization: (key: string, settings: Record<string, any>) => 
    api.put(`/admin/customization/${key}`, { settings }),
  resetCustomization: (key: string) => api.delete(`/admin/customization/${key}`),
  // Page Builder
  getPages: (params?: { published?: string }) => api.get('/admin/pages', { params }),
  getPage: (id: string) => api.get(`/admin/pages/${id}`),
  createPage: (data: { page_id: string; title: string; description?: string; components: any[]; is_published?: boolean }) =>
    api.post('/admin/pages', data),
  updatePage: (id: string, data: { page_id?: string; title?: string; description?: string; components?: any[]; is_published?: boolean }) =>
    api.put(`/admin/pages/${id}`, data),
  deletePage: (id: string) => api.delete(`/admin/pages/${id}`),
  // POS
  createPOSOrder: (data: {
    customer_id?: number
    items: Array<{
      product_id: number
      quantity: number
      price: number
      variations?: Record<string, string>
    }>
    address?: string
    city?: string
    postal_code?: string
    country?: string
    coupon_code?: string
    payments: Array<{ method: string; amount: number; reference?: string }>
    notes?: string
  }) => api.post('/admin/pos/order', data),
  getPOSOrders: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/admin/pos/orders', { params }),
  getPOSOrder: (id: number) => api.get(`/admin/pos/orders/${id}`),
  getCustomers: () => api.get('/admin/customers'),
  getCustomer: (id: number) => api.get(`/admin/customers/${id}`),
  deleteShippingMethod: (id: number) => api.delete(`/admin/shipping-methods/${id}`),
  // Refunds
  getRefunds: (params?: { status?: string }) => api.get('/admin/refunds', { params }),
  updateRefundStatus: (id: number, data: { status: string; notes?: string }) => api.put(`/admin/refunds/${id}/status`, data),
  // Audit Logs
  getAuditLogs: (params?: { user_id?: number; action?: string; entity_type?: string; page?: number; limit?: number }) => 
    api.get('/admin/audit-logs', { params }),
  // Import/Export
  exportProductsCSV: (params?: { category_id?: number }) => api.get('/admin/products/export/csv', { params, responseType: 'blob' }),
  importProductsCSV: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/products/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // Upload
  uploadImage: (formData: FormData) => {
    return api.post('/admin/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // Campaigns
  getCampaigns: () => api.get('/admin/campaigns'),
  getCampaign: (id: number) => api.get(`/admin/campaigns/${id}`),
  createCampaign: (data: { name: string; code: string; description?: string; start_date: string; end_date: string; is_active?: boolean }) => 
    api.post('/admin/campaigns', data),
  updateCampaign: (id: number, data: any) => api.put(`/admin/campaigns/${id}`, data),
  deleteCampaign: (id: number) => api.delete(`/admin/campaigns/${id}`),
  getCampaignStats: (id: number) => api.get(`/admin/campaigns/${id}/stats`),
  // Support/Chat
  getChats: (params?: { status?: string }) => api.get('/admin/support/chats', { params }),
  getChatMessages: (id: number) => api.get(`/admin/support/chats/${id}/messages`),
  sendChatMessage: (id: number, message: string) => api.post(`/admin/support/chats/${id}/message`, { message }),
  updateChatStatus: (id: number, status: 'active' | 'resolved' | 'pending') => api.put(`/admin/support/chats/${id}/status`, { status }),
  // Dashboard Settings
  getDashboardSettings: () => api.get('/admin/dashboard/settings'),
  updateDashboardSettings: (data: any) => api.put('/admin/dashboard/settings', data),
  // POS Settings
  getPOSSettings: () => api.get('/admin/pos/settings'),
  updatePOSSettings: (data: any) => api.put('/admin/pos/settings', data),
  // Payment Gateways
  getPaymentGateways: () => api.get('/admin/payment-gateways'),
  updatePaymentGateway: (data: {
    gateway: string
    is_active: boolean
    is_test_mode: boolean
    public_key?: string
    secret_key?: string
    merchant_id?: string
    store_id?: string
    store_password?: string
    client_id?: string
    client_secret?: string
    webhook_url?: string
  }) => api.put('/admin/payment-gateways', data),
  setDefaultPaymentGateway: (gateway: string) => api.put('/admin/payment-gateways/default', { gateway }),
  // Tax Rates
  getTaxRates: () => api.get('/admin/tax-rates'),
  getTaxRate: (id: number) => api.get(`/admin/tax-rates/${id}`),
  createTaxRate: (data: any) => api.post('/admin/tax-rates', data),
  updateTaxRate: (id: number, data: any) => api.put(`/admin/tax-rates/${id}`, data),
  deleteTaxRate: (id: number) => api.delete(`/admin/tax-rates/${id}`),
  getTaxRateForLocation: (params: { country?: string; region?: string; city?: string }) => 
    api.get('/tax-rate', { params }),
  // Tax Reports
  getTaxReports: (params?: { from?: string; to?: string; country?: string }) => 
    api.get('/admin/tax-reports', { params }),
  // Email Invoice
  sendInvoiceEmail: (orderId: number) => api.post(`/admin/orders/${orderId}/invoice/email`),
}

export default api

