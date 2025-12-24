'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiShoppingCart, FiArrowLeft, FiDollarSign, FiCheckCircle, FiClock, FiXCircle, FiChevronDown, FiChevronUp, FiPrinter, FiEye, FiEdit2, FiSave, FiCheck, FiDownload, FiUpload, FiCalendar, FiPackage, FiPauseCircle, FiRefreshCw } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface Payment {
  id: number
  method: string
  amount: number
  reference?: string
  created_at: string
}

interface OrderItem {
  id: number
  product_id: number
  product: {
    id: number
    name: string
    image?: string
  }
  quantity: number
  price: number
}

interface POSOrder {
  id: number
  user_id: number
  user?: {
    id: number
    name: string
    email: string
    phone?: string
  }
  total: number
  status: string
  address: string
  city: string
  postal_code: string
  country: string
  created_at: string
  items: OrderItem[]
  payments: Payment[]
  total_paid: number
  remaining_balance: number
  is_fully_paid: boolean
  notes?: string
}

export default function POSOrdersPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [orders, setOrders] = useState<POSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('')
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set())
  const [editingOrders, setEditingOrders] = useState<Map<number, {
    customerName: string
    phone: string
    address: string
    notes: string
  }>>(new Map())
  const [savingOrders, setSavingOrders] = useState<Set<number>>(new Set())
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!user || !token || !['admin', 'staff', 'manager'].includes(user.role?.toLowerCase() || '')) {
      router.push('/admin/login')
      return
    }
    fetchOrders()
  }, [user, token, router, statusFilter, searchQuery])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params: { [key: string]: any } = {}
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      
      const response = await adminAPI.getPOSOrders(params)
      setOrders(response.data.orders || [])
    } catch (error) {
      console.error('Failed to fetch POS orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'partial':
        return 'bg-blue-100 text-blue-800'
      case 'partial refund':
        return 'bg-orange-100 text-orange-800'
      case 'full refund':
        return 'bg-red-100 text-red-800'
      case 'hold':
        return 'bg-purple-100 text-purple-800'
      case 'delivering':
        return 'bg-indigo-100 text-indigo-800'
      case 'processing':
        return 'bg-cyan-100 text-cyan-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <FiCheckCircle className="w-4 h-4" />
      case 'pending':
        return <FiClock className="w-4 h-4" />
      case 'partial':
        return <FiDollarSign className="w-4 h-4" />
      case 'partial refund':
        return <FiRefreshCw className="w-4 h-4" />
      case 'full refund':
        return <FiRefreshCw className="w-4 h-4" />
      case 'hold':
        return <FiPauseCircle className="w-4 h-4" />
      case 'delivering':
        return <FiPackage className="w-4 h-4" />
      case 'processing':
        return <FiClock className="w-4 h-4" />
      case 'cancelled':
        return <FiXCircle className="w-4 h-4" />
      default:
        return <FiXCircle className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString)
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return { datePart, timePart }
  }

  const handlePrint = (order: POSOrder) => {
    const customerName = extractCustomerNameFromNotes(order.notes, order.user)
    const phone = extractPhoneFromNotes(order.notes, order.user)
    const dateTime = formatTableDate(order.created_at)
    
    // Calculate subtotal
    const items = order.items || []
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discount = subtotal - order.total
    
    // Open print dialog with POS receipt
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt #${order.id}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 10mm 5mm;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Courier New', monospace;
                width: 80mm;
                max-width: 80mm;
                margin: 0 auto;
                padding: 10mm 5mm;
                font-size: 12px;
                line-height: 1.4;
              }
              .receipt {
                width: 100%;
              }
              .header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 1px dashed #000;
                padding-bottom: 10px;
              }
              .store-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
                text-transform: uppercase;
              }
              .store-address {
                font-size: 10px;
                margin-bottom: 3px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .order-info {
                margin: 10px 0;
                font-size: 11px;
              }
              .order-info-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
              }
              .items {
                margin: 10px 0;
              }
              .item-row {
                margin: 5px 0;
                font-size: 11px;
              }
              .item-name {
                margin-bottom: 2px;
                word-wrap: break-word;
              }
              .item-details {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #666;
              }
              .totals {
                margin: 10px 0;
                border-top: 1px dashed #000;
                padding-top: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                font-size: 12px;
              }
              .total-row.grand-total {
                font-weight: bold;
                font-size: 14px;
                border-top: 1px solid #000;
                padding-top: 5px;
                margin-top: 10px;
              }
              .payments {
                margin: 10px 0;
                border-top: 1px dashed #000;
                padding-top: 10px;
              }
              .payment-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                font-size: 11px;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px dashed #000;
                font-size: 10px;
              }
              .center {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="store-name">EcomStore</div>
                <div class="store-address">Point of Sale Receipt</div>
              </div>
              
              <div class="divider"></div>
              
              <div class="order-info">
                <div class="order-info-row">
                  <span>Order #:</span>
                  <span>${order.id}</span>
                </div>
                <div class="order-info-row">
                  <span>Date:</span>
                  <span>${dateTime.datePart}</span>
                </div>
                <div class="order-info-row">
                  <span>Time:</span>
                  <span>${dateTime.timePart}</span>
                </div>
                <div class="order-info-row">
                  <span>Customer:</span>
                  <span>${customerName}</span>
                </div>
                ${phone !== '-' ? `
                <div class="order-info-row">
                  <span>Phone:</span>
                  <span>${phone}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="divider"></div>
              
              <div class="items">
                ${items.map(item => `
                  <div class="item-row">
                    <div class="item-name">${item.product?.name || 'Product'}</div>
                    <div class="item-details">
                      <span>${item.quantity} x ৳${item.price.toFixed(2)}</span>
                      <span>৳${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div class="divider"></div>
              
              <div class="totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>৳${subtotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-৳${discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>৳${order.total.toFixed(2)}</span>
                </div>
              </div>
              
              ${order.payments && order.payments.length > 0 ? `
              <div class="payments">
                <div class="center" style="margin-bottom: 5px; font-weight: bold;">PAYMENT</div>
                ${order.payments.map(payment => `
                  <div class="payment-row">
                    <span>${payment.method.toUpperCase()}:</span>
                    <span>৳${payment.amount.toFixed(2)}</span>
                  </div>
                `).join('')}
                <div class="payment-row" style="margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
                  <span>Total Paid:</span>
                  <span>৳${order.total_paid.toFixed(2)}</span>
                </div>
                ${order.remaining_balance > 0 ? `
                <div class="payment-row">
                  <span>Balance:</span>
                  <span>৳${order.remaining_balance.toFixed(2)}</span>
                </div>
                ` : ''}
                ${order.is_fully_paid ? `
                <div class="payment-row" style="font-weight: bold; color: green;">
                  <span>Status:</span>
                  <span>FULLY PAID</span>
                </div>
                ` : ''}
              </div>
              ` : ''}
              
              <div class="divider"></div>
              
              <div class="footer">
                <div style="margin-bottom: 5px;">Thank you for your purchase!</div>
                <div>Visit us again</div>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 250)
    }
  }

  const extractPhoneFromNotes = (notes?: string, user?: { phone?: string }) => {
    if (user?.phone) return user.phone
    if (!notes) return '-'
    // Try to extract phone from notes if it's in format "Phone: xxx"
    const phoneMatch = notes.match(/[Pp]hone:\s*([0-9+\-\s()]+)/)
    return phoneMatch ? phoneMatch[1].trim() : '-'
  }

  const extractCustomerNameFromNotes = (notes?: string, user?: { name?: string }) => {
    if (user?.name) return user.name
    if (!notes) return 'Walk-in Customer'
    // Try to extract customer name from notes if it's in format "Customer: xxx"
    const customerMatch = notes.match(/[Cc]ustomer:\s*([^,]+)/)
    return customerMatch ? customerMatch[1].trim() : 'Walk-in Customer'
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(prev => new Set(prev).add(orderId))
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus)
      // Update the order in local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
    } catch (error) {
      console.error('Failed to update order status:', error)
      alert('Failed to update order status. Please try again.')
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const getPaymentStatus = (order: POSOrder) => {
    if (order.is_fully_paid) {
      return { text: 'Fully Paid', color: 'bg-green-100 text-green-800' }
    } else if (order.total_paid > 0) {
      return { text: 'Partial', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { text: 'Unpaid', color: 'bg-red-100 text-red-800' }
    }
  }

  const startEditing = (order: POSOrder) => {
    const customerName = extractCustomerNameFromNotes(order.notes, order.user)
    const phone = extractPhoneFromNotes(order.notes, order.user)
    const fullAddress = `${order.address}${order.city ? ', ' + order.city : ''}${order.postal_code ? ', ' + order.postal_code : ''}${order.country ? ', ' + order.country : ''}`
    
    // Extract just the notes part (remove customer info if present)
    let notesOnly = order.notes || ''
    if (notesOnly.includes('Customer:') || notesOnly.includes('Phone:')) {
      // Remove customer info from notes
      notesOnly = notesOnly.replace(/Customer:\s*[^,]+(?:,\s*Phone:\s*[^.]*)?\.?\s*/i, '').trim()
    }
    
    setEditingOrders(prev => {
      const newMap = new Map(prev)
      newMap.set(order.id, {
        customerName,
        phone,
        address: fullAddress,
        notes: notesOnly
      })
      return newMap
    })
  }

  const cancelEditing = (orderId: number) => {
    setEditingOrders(prev => {
      const newMap = new Map(prev)
      newMap.delete(orderId)
      return newMap
    })
  }

  const updateEditingField = (orderId: number, field: 'customerName' | 'phone' | 'address' | 'notes', value: string) => {
    setEditingOrders(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(orderId) || { customerName: '', phone: '', address: '', notes: '' }
      newMap.set(orderId, { ...current, [field]: value })
      return newMap
    })
  }

  const handleSaveOrder = async (order: POSOrder) => {
    const editedData = editingOrders.get(order.id)
    if (!editedData) return

    setSavingOrders(prev => new Set(prev).add(order.id))
    try {
      // Parse address back into components (simple parsing)
      const addressParts = editedData.address.split(',').map(s => s.trim())
      const address = addressParts[0] || order.address
      const city = addressParts[1] || order.city || 'N/A'
      const postalCode = addressParts[2] || order.postal_code || 'N/A'
      const country = addressParts[3] || order.country || 'N/A'

      // Update notes with customer info
      let notes = editedData.notes
      if (editedData.customerName && editedData.customerName !== 'Walk-in Customer') {
        notes = `Customer: ${editedData.customerName}${editedData.phone ? `, Phone: ${editedData.phone}` : ''}${editedData.notes ? `. ${editedData.notes}` : ''}`
      }

      // Update the order
      await adminAPI.updateOrder(order.id, {
        address,
        city,
        postal_code: postalCode,
        country,
        notes
      })
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? { 
                ...o, 
                address,
                city,
                postal_code: postalCode,
                country,
                notes
              } 
            : o
        )
      )

      // Clear editing state
      cancelEditing(order.id)
    } catch (error) {
      console.error('Failed to update order:', error)
      alert('Failed to update order. Please try again.')
    } finally {
      setSavingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(order.id)
        return newSet
      })
    }
  }

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)))
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) return

    setBulkUpdating(true)
    try {
      await adminAPI.bulkUpdateOrderStatus(Array.from(selectedOrders), newStatus)
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          selectedOrders.has(order.id) ? { ...order, status: newStatus } : order
        )
      )
      
      // Clear selection
      setSelectedOrders(new Set())
      alert(`Successfully updated ${selectedOrders.size} order(s) status to ${newStatus}`)
    } catch (error) {
      console.error('Failed to update order statuses:', error)
      alert('Failed to update order statuses. Please try again.')
    } finally {
      setBulkUpdating(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - now.getDay())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const quarterly = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)

    switch (dateRange) {
      case 'today':
        return { from: today, to: now }
      case 'yesterday':
        return { from: yesterday, to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) }
      case 'thisWeek':
        return { from: thisWeek, to: now }
      case 'thisMonth':
        return { from: thisMonth, to: now }
      case 'quarterly':
        return { from: quarterly, to: now }
      case 'custom':
        return {
          from: customDateFrom ? new Date(customDateFrom) : null,
          to: customDateTo ? new Date(customDateTo + 'T23:59:59') : null
        }
      default:
        return { from: null, to: null }
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const dateRangeObj = getDateRange()
      const params: any = {}
      
      if (dateRangeObj.from) {
        params.from = dateRangeObj.from.toISOString().split('T')[0]
      }
      if (dateRangeObj.to) {
        params.to = dateRangeObj.to.toISOString().split('T')[0]
      }
      if (statusFilter) {
        params.status = statusFilter
      }

      const response = await adminAPI.exportOrdersCSV(params)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `pos-orders-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      alert('Orders exported successfully!')
    } catch (error) {
      console.error('Failed to export orders:', error)
      alert('Failed to export orders. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      // Read CSV file
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Parse CSV (basic implementation)
      // Note: This is a simple CSV parser. For production, consider using a library like papaparse
      const importedOrders = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim())
          const order: any = {}
          headers.forEach((header, index) => {
            order[header] = values[index]
          })
          return order
        })

      // TODO: Send to backend API to import orders
      // For now, just show a message
      alert(`Successfully parsed ${importedOrders.length} orders from CSV. Import functionality needs backend API endpoint.`)
      
      // Reset file input
      event.target.value = ''
    } catch (error) {
      console.error('Failed to import orders:', error)
      alert('Failed to import orders. Please check the CSV format.')
    } finally {
      setImporting(false)
    }
  }

  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Get unique payment methods from orders
  const getPaymentMethods = () => {
    const methods = new Set<string>()
    orders.forEach(order => {
      if (order.payments && Array.isArray(order.payments)) {
        order.payments.forEach(payment => {
          if (payment.method) {
            methods.add(payment.method.toLowerCase())
          }
        })
      }
    })
    return Array.from(methods).sort()
  }

  // Filter orders based on all criteria
  const filteredOrders = orders.filter(order => {
    // Date range filter
    if (dateRange !== 'all') {
      const dateRangeObj = getDateRange()
      const orderDate = new Date(order.created_at)
      
      if (dateRangeObj.from && orderDate < dateRangeObj.from) {
        return false
      }
      if (dateRangeObj.to && orderDate > dateRangeObj.to) {
        return false
      }
    }

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        order.id.toString().includes(searchLower) ||
        order.user?.name?.toLowerCase().includes(searchLower) ||
        order.user?.email?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter && order.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false
    }

    // Min amount filter
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min) && order.total < min) {
        return false
      }
    }

    // Max amount filter
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max) && order.total > max) {
        return false
      }
    }

    // Payment method filter
    if (paymentMethodFilter) {
      const hasPaymentMethod = order.payments && Array.isArray(order.payments) &&
        order.payments.some(payment => 
          payment.method?.toLowerCase() === paymentMethodFilter.toLowerCase()
        )
      if (!hasPaymentMethod) {
        return false
      }
    }

    return true
  })

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POS Orders</h1>
            <p className="text-sm text-gray-600 mt-1">View all point of sale transactions</p>
          </div>
          <Link
            href="/admin/pos"
            className="flex items-center space-x-2 text-[#ff6b35] hover:text-[#ff8c5a] transition"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to POS</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-3">
          {/* First Row - All Filters */}
          <div className="flex items-center flex-wrap gap-3 lg:flex-nowrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <FiCalendar className="w-4 h-4 text-gray-600" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              >
                <option value="all">All Orders</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="quarterly">Quarterly</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                  />
                </div>
              </>
            )}
            
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm whitespace-nowrap"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial Payment</option>
              <option value="partial refund">Partial Refund</option>
              <option value="full refund">Full Refund</option>
              <option value="hold">Hold</option>
              <option value="delivering">Delivering</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Min Amount */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Min:</label>
              <input
                type="number"
                placeholder="0.00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Amount */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Max:</label>
              <input
                type="number"
                placeholder="0.00"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment Method */}
            <div className="flex items-center space-x-2 min-w-[180px]">
              <label className="text-sm text-gray-600 whitespace-nowrap">Payment:</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white text-sm"
              >
                <option value="">All Methods</option>
                {getPaymentMethods().map((method) => (
                  <option key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Import/Export Buttons */}
            <div className="flex items-center space-x-2">
              <label className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                  id="import-file"
                />
                <button
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={importing}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <FiUpload className="w-4 h-4" />
                  <span>{importing ? 'Importing...' : 'Import'}</span>
                </button>
              </label>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center space-x-2 px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <FiDownload className="w-4 h-4" />
                <span>{exporting ? 'Exporting...' : 'Export'}</span>
              </button>
            </div>

            {/* Clear Filters Button */}
            {(minAmount || maxAmount || paymentMethodFilter || statusFilter || searchQuery || dateRange !== 'all') && (
              <button
                onClick={() => {
                  setMinAmount('')
                  setMaxAmount('')
                  setPaymentMethodFilter('')
                  setStatusFilter('')
                  setSearchQuery('')
                  setDateRange('all')
                  setCustomDateFrom('')
                  setCustomDateTo('')
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiShoppingCart className="mx-auto text-6xl text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No POS orders found</h2>
            <p className="text-gray-600 mb-6">Start processing sales to see orders here</p>
            <Link
              href="/admin/pos"
              className="inline-block bg-[#ff6b35] text-gray-900 px-6 py-3 rounded-lg hover:bg-[#ff8c5a] transition"
            >
              Go to POS System
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FiShoppingCart className="mx-auto text-6xl text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No orders match your filters</h2>
                <p className="text-gray-600 mb-6">Try adjusting your filter criteria</p>
                <button
                  onClick={() => {
                    setMinAmount('')
                    setMaxAmount('')
                    setPaymentMethodFilter('')
                    setStatusFilter('')
                    setSearchQuery('')
                  }}
                  className="inline-block bg-[#ff6b35] text-gray-900 px-6 py-3 rounded-lg hover:bg-[#ff8c5a] transition"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                {/* Bulk Action Bar */}
                {selectedOrders.size > 0 && (
                  <div className="mb-3 bg-[#ff6b35] text-gray-900 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">
                        {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={() => setSelectedOrders(new Set())}
                        className="text-sm underline hover:no-underline"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Change status to:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkStatusUpdate(e.target.value)
                            e.target.value = ''
                          }
                        }}
                        disabled={bulkUpdating}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-gray-900 disabled:opacity-50"
                      >
                        <option value="">Select status...</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="partial">Partial Payment</option>
                        <option value="partial refund">Partial Refund</option>
                        <option value="full refund">Full Refund</option>
                        <option value="hold">Hold</option>
                        <option value="delivering">Delivering</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {bulkUpdating && (
                        <span className="text-sm">Updating...</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mb-3 text-sm text-gray-600">
                  Showing {filteredOrders.length} of {orders.length} orders
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-center w-12">
                            <input
                              type="checkbox"
                              checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35] cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Address</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Note</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Products</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Print</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => {
                          const customerName = extractCustomerNameFromNotes(order.notes, order.user)
                          const phone = extractPhoneFromNotes(order.notes, order.user)
                          const fullAddress = `${order.address}${order.city ? ', ' + order.city : ''}${order.postal_code ? ', ' + order.postal_code : ''}${order.country ? ', ' + order.country : ''}`
                          
                          return (
                            <tr key={order.id} className={`hover:bg-gray-50 transition ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.has(order.id)}
                                  onChange={() => toggleOrderSelection(order.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35] cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-semibold text-gray-900">#{order.id}</span>
                              </td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const { datePart, timePart } = formatTableDate(order.created_at)
                                  return (
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-gray-900">{timePart}</span>
                                      <span className="text-xs text-gray-600">{datePart}</span>
                                    </div>
                                  )
                                })()}
                              </td>
                              <td className="px-4 py-3">
                                {editingOrders.has(order.id) ? (
                                  <input
                                    type="text"
                                    value={editingOrders.get(order.id)?.customerName || ''}
                                    onChange={(e) => updateEditingField(order.id, 'customerName', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1 text-sm border border-[#ff6b35] rounded focus:outline-none focus:ring-1 focus:ring-[#ff6b35] text-gray-900"
                                  />
                                ) : (
                                  <span 
                                    className="text-sm text-gray-900 cursor-pointer hover:text-[#ff6b35] transition"
                                    onClick={() => startEditing(order)}
                                    title="Click to edit"
                                  >
                                    {customerName}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {editingOrders.has(order.id) ? (
                                  <input
                                    type="text"
                                    value={editingOrders.get(order.id)?.phone || ''}
                                    onChange={(e) => updateEditingField(order.id, 'phone', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1 text-sm border border-[#ff6b35] rounded focus:outline-none focus:ring-1 focus:ring-[#ff6b35] text-gray-900"
                                  />
                                ) : (
                                  <span 
                                    className="text-sm text-gray-600 cursor-pointer hover:text-[#ff6b35] transition"
                                    onClick={() => startEditing(order)}
                                    title="Click to edit"
                                  >
                                    {phone}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                {editingOrders.has(order.id) ? (
                                  <input
                                    type="text"
                                    value={editingOrders.get(order.id)?.address || ''}
                                    onChange={(e) => updateEditingField(order.id, 'address', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1 text-sm border border-[#ff6b35] rounded focus:outline-none focus:ring-1 focus:ring-[#ff6b35] text-gray-900"
                                  />
                                ) : (
                                  <span 
                                    className="text-sm text-gray-600 truncate block cursor-pointer hover:text-[#ff6b35] transition" 
                                    title={fullAddress}
                                    onClick={() => startEditing(order)}
                                  >
                                    {fullAddress || '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                {editingOrders.has(order.id) ? (
                                  <input
                                    type="text"
                                    value={editingOrders.get(order.id)?.notes || ''}
                                    onChange={(e) => updateEditingField(order.id, 'notes', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1 text-sm border border-[#ff6b35] rounded focus:outline-none focus:ring-1 focus:ring-[#ff6b35] text-gray-900"
                                  />
                                ) : (
                                  <span 
                                    className="text-sm text-gray-600 truncate block cursor-pointer hover:text-[#ff6b35] transition" 
                                    title={order.notes || ''}
                                    onClick={() => startEditing(order)}
                                  >
                                    {order.notes || '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {order.items && order.items.length > 0 ? (
                                    <>
                                      {order.items.slice(0, 2).map((item, idx) => (
                                        <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                          {item.product?.name || 'Product'} ({item.quantity})
                                        </span>
                                      ))}
                                      {order.items.length > 2 && (
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                          +{order.items.length - 2} more
                      </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                  disabled={updatingStatus.has(order.id)}
                                  className={`text-xs font-semibold px-2 py-1 rounded border-0 focus:ring-2 focus:ring-[#ff6b35] ${getStatusColor(order.status)} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="completed">Completed</option>
                                  <option value="partial">Partial Payment</option>
                                  <option value="partial refund">Partial Refund</option>
                                  <option value="full refund">Full Refund</option>
                                  <option value="hold">Hold</option>
                                  <option value="delivering">Delivering</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                {updatingStatus.has(order.id) && (
                                  <span className="ml-2 text-xs text-gray-500">Updating...</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {order.payments && Array.isArray(order.payments) && order.payments.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {order.payments.map((payment, index) => (
                                      <div key={payment.id || index} className="text-xs text-gray-700">
                                        <span className="capitalize">{payment.method}</span> <span className="font-semibold text-gray-900">৳{payment.amount.toFixed(2)}</span>
                                      </div>
                                    ))}
                                    <div className="text-xs font-bold text-gray-900 pt-0.5 border-t border-gray-200 mt-0.5">
                                      Total = ৳{order.total.toFixed(2)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">No payments</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {editingOrders.has(order.id) ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveOrder(order)}
                                        disabled={savingOrders.has(order.id)}
                                        className="inline-flex items-center px-2 py-1 text-sm text-white bg-[#ff6b35] hover:bg-[#ff8c5a] rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Save Changes"
                                      >
                                        <FiSave className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => cancelEditing(order.id)}
                                        disabled={savingOrders.has(order.id)}
                                        className="inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:text-gray-900 transition disabled:opacity-50"
                                        title="Cancel"
                                      >
                                        <FiXCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => toggleOrder(order.id)}
                                        className="inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:text-[#ff6b35] transition"
                                        title="View Details"
                                      >
                                        <FiEye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => startEditing(order)}
                                        className="inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:text-[#ff6b35] transition"
                                        title="Edit"
                                      >
                                        <FiEdit2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                {savingOrders.has(order.id) && (
                                  <span className="block text-xs text-gray-500 mt-1">Saving...</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handlePrint(order)}
                                  className="inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:text-[#ff6b35] transition"
                                  title="Print Order"
                                >
                                  <FiPrinter className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expanded Details Modal/Overlay */}
                {expandedOrders.size > 0 && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setExpandedOrders(new Set())}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {Array.from(expandedOrders).map(orderId => {
                        const order = filteredOrders.find(o => o.id === orderId)
                        if (!order) return null
                        
                        return (
                          <div key={orderId} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="text-xl font-bold text-gray-900">Order #{order.id} Details</h2>
                              <button
                                onClick={() => toggleOrder(orderId)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <FiXCircle className="w-6 h-6" />
                              </button>
                            </div>
                            
                            {/* Customer Info */}
                            {order.user && (
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Customer</p>
                                <p className="text-sm text-gray-900">{order.user.name}</p>
                                <p className="text-xs text-gray-600">{order.user.email}</p>
                              </div>
                            )}

                {/* Payment Summary */}
                {order.payments && Array.isArray(order.payments) && order.payments.length > 0 && (
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-gray-900">Payments ({order.payments.length})</p>
                      {order.is_fully_paid ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">Fully Paid</span>
                      ) : (
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">Partial</span>
                      )}
                    </div>
                                <div className="space-y-1.5 mb-2">
                      {order.payments.map((payment, index) => (
                                    <div key={payment.id || index} className="flex items-center justify-between p-1.5 bg-white rounded border border-gray-200 text-xs">
                          <div className="flex items-center space-x-2">
                                        <span className="w-5 h-5 bg-[#ff6b35] text-gray-900 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {index + 1}
                            </span>
                                        <span className="font-medium text-gray-900 capitalize">{payment.method}</span>
                              {payment.reference && (
                                          <span className="text-gray-500">({payment.reference})</span>
                              )}
                            </div>
                                      <span className="font-semibold text-gray-900">৳{payment.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                                <div className="pt-2 border-t border-gray-300 space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Total Paid:</span>
                                    <span className="font-bold text-green-600">৳{order.total_paid.toFixed(2)}</span>
                      </div>
                      {order.remaining_balance > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-yellow-700">Remaining:</span>
                          <span className="font-bold text-yellow-600">৳{order.remaining_balance.toFixed(2)}</span>
                        </div>
                      )}
                                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <span className="font-semibold text-gray-700">Order Total:</span>
                        <span className="font-bold text-gray-900">৳{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                                <p className="text-sm font-semibold text-gray-900 mb-3">Order Items ({order.items.length})</p>
                    <div className="space-y-2">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 mb-1">
                                          {item.product?.name || 'Product'}
                                        </p>
                                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                                          <span>Quantity: <span className="font-semibold text-gray-900">{item.quantity}</span></span>
                                          <span>Unit Price: <span className="font-semibold text-gray-900">৳{item.price.toFixed(2)}</span></span>
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm font-bold text-[#ff6b35]">
                            ৳{(item.price * item.quantity).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500">Total</p>
                                      </div>
                        </div>
                      ))}
                                </div>
                              </div>
                      )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

