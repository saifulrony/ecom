'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiDollarSign, FiCheck, FiX, FiClock, FiSearch } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface Refund {
  id: number
  order_id: number
  order: { id: number; user: { name: string } }
  amount: number
  reason: string
  status: string
  notes: string
  created_at: string
  processed_at: string | null
}

export default function AdminRefundsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' })

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchRefunds()
  }, [user, token, router, filter])

  const fetchRefunds = async () => {
    try {
      const response = await adminAPI.getRefunds({ status: filter === 'all' ? '' : filter })
      setRefunds(response.data.refunds || [])
    } catch (error) {
      console.error('Failed to fetch refunds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedRefund || !statusUpdate.status) return
    try {
      await adminAPI.updateRefundStatus(selectedRefund.id, statusUpdate)
      setShowModal(false)
      setSelectedRefund(null)
      setStatusUpdate({ status: '', notes: '' })
      fetchRefunds()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update refund status')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      processed: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
          <p className="text-gray-600 mt-1">Manage customer refund requests</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
        >
          <option value="all">All Refunds</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="processed">Processed</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {refunds.length > 0 ? (
                refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{refund.id}</td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/orders/${refund.order_id}`} className="text-[#ff6b35] hover:underline">
                        Order #{refund.order_id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {refund.order?.user?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">৳{refund.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{refund.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(refund.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {refund.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedRefund(refund)
                            setStatusUpdate({ status: '', notes: '' })
                            setShowModal(true)
                          }}
                          className="text-[#ff6b35] hover:text-[#ff8c5a] text-sm font-medium"
                        >
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No refunds found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {showModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Update Refund Status</h2>
              <p className="text-sm text-gray-500 mt-1">Refund #{selectedRefund.id} - ৳{selectedRefund.amount.toFixed(2)}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleStatusUpdate(); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  required
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                >
                  <option value="">Select Status</option>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="processed">Mark as Processed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  placeholder="Add any notes about this refund..."
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedRefund(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

