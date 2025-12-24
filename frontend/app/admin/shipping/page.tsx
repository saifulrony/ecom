'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiEdit, FiTrash2, FiTruck } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface ShippingMethod {
  id: number
  name: string
  description: string
  cost: number
  is_active: boolean
  estimated_days: number
}

export default function AdminShippingPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: '',
    estimated_days: '7',
    is_active: true,
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchMethods()
  }, [user, token, router])

  const fetchMethods = async () => {
    try {
      const response = await adminAPI.getShippingMethods()
      setMethods(response.data.shipping_methods || [])
    } catch (error) {
      console.error('Failed to fetch shipping methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        cost: parseFloat(formData.cost),
        estimated_days: parseInt(formData.estimated_days),
        is_active: formData.is_active,
      }

      if (editingMethod) {
        await adminAPI.updateShippingMethod(editingMethod.id, data)
      } else {
        await adminAPI.createShippingMethod(data)
      }

      setShowModal(false)
      setEditingMethod(null)
      resetForm()
      fetchMethods()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save shipping method')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shipping method?')) return
    try {
      await adminAPI.deleteShippingMethod(id)
      fetchMethods()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete shipping method')
    }
  }

  const openEditModal = (method: ShippingMethod) => {
    setEditingMethod(method)
    setFormData({
      name: method.name,
      description: method.description,
      cost: method.cost.toString(),
      estimated_days: method.estimated_days.toString(),
      is_active: method.is_active,
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cost: '',
      estimated_days: '7',
      is_active: true,
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Methods</h1>
          <p className="text-gray-600 mt-1">Manage shipping options and costs</p>
        </div>
        <button
          onClick={() => {
            setEditingMethod(null)
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center space-x-2 bg-[#ff6b35] text-gray-900 px-4 py-2 rounded-lg hover:bg-[#ff8c5a] transition"
        >
          <FiPlus />
          <span>Add Shipping Method</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {methods.map((method) => (
          <div key={method.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FiTruck className="w-8 h-8 text-[#ff6b35]" />
                <div>
                  <h3 className="font-semibold text-gray-900">{method.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    method.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {method.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{method.description}</p>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cost:</span>
                <span className="font-semibold text-gray-900">৳{method.cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Estimated Days:</span>
                <span className="font-semibold text-gray-900">{method.estimated_days} days</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => openEditModal(method)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <FiEdit className="w-4 h-4 inline mr-2" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(method.id)}
                className="px-3 py-2 text-sm border border-red-300 rounded-lg hover:bg-red-50 text-red-600"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {methods.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FiTruck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No shipping methods configured</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-[#ff6b35] hover:underline"
          >
            Create your first shipping method
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMethod ? 'Edit Shipping Method' : 'Add Shipping Method'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  placeholder="Standard Shipping"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  placeholder="Shipping description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Days</label>
                  <input
                    type="number"
                    required
                    value={formData.estimated_days}
                    onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingMethod(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  {editingMethod ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

