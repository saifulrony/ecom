'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, productAPI, Product, ProductVariation, VariationOption } from '@/lib/api'

export default function ProductVariationsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, token } = useAuthStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [showOptionModal, setShowOptionModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null)
  const [editingOption, setEditingOption] = useState<VariationOption | null>(null)
  const [variationForm, setVariationForm] = useState({
    name: '',
    is_required: true,
    allow_custom: false,
  })
  const [optionForm, setOptionForm] = useState({
    value: '',
    price_modifier: '',
    stock: '',
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    if (params.id) {
      fetchData()
    }
  }, [user, token, router, params.id])

  const fetchData = async () => {
    try {
      const [productRes, variationsRes] = await Promise.all([
        productAPI.getProduct(Number(params.id)),
        adminAPI.getProductVariations(Number(params.id)),
      ])
      setProduct(productRes.data)
      setVariations(variationsRes.data.variations || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVariation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingVariation) {
        await adminAPI.updateProductVariation(editingVariation.id, variationForm)
      } else {
        await adminAPI.createProductVariation(Number(params.id), variationForm)
      }
      setShowVariationModal(false)
      setEditingVariation(null)
      setVariationForm({ name: '', is_required: true, allow_custom: false })
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save variation')
    }
  }

  const handleDeleteVariation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this variation?')) return
    try {
      await adminAPI.deleteProductVariation(id)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete variation')
    }
  }

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariation) return
    try {
      if (editingOption) {
        await adminAPI.updateVariationOption(selectedVariation.id, editingOption.id, {
          value: optionForm.value,
          price_modifier: parseFloat(optionForm.price_modifier) || 0,
          stock: parseInt(optionForm.stock) || 0,
        })
      } else {
        await adminAPI.createVariationOption(selectedVariation.id, {
          value: optionForm.value,
          price_modifier: parseFloat(optionForm.price_modifier) || 0,
          stock: parseInt(optionForm.stock) || 0,
        })
      }
      setShowOptionModal(false)
      setSelectedVariation(null)
      setEditingOption(null)
      setOptionForm({ value: '', price_modifier: '', stock: '' })
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save option')
    }
  }

  const handleDeleteOption = async (variationId: number, optionId: number) => {
    if (!confirm('Are you sure you want to delete this option?')) return
    try {
      await adminAPI.deleteVariationOption(variationId, optionId)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete option')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/products"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Variations</h1>
            <p className="text-gray-600 mt-1">{product?.name}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingVariation(null)
            setVariationForm({ name: '', is_required: true, allow_custom: false })
            setShowVariationModal(true)
          }}
          className="flex items-center space-x-2 bg-[#ff6b35] text-gray-900 px-4 py-2 rounded-lg hover:bg-[#ff8c5a] transition"
        >
          <FiPlus />
          <span>Add Variation</span>
        </button>
      </div>

      {/* Variations List */}
      <div className="space-y-4">
        {variations.length > 0 ? (
          variations.map((variation) => (
            <div key={variation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{variation.name}</h3>
                  <div className="flex items-center space-x-4 mt-1">
                    {variation.is_required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                    )}
                    {variation.allow_custom && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Allows Custom</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedVariation(variation)
                      setEditingOption(null)
                      setOptionForm({ value: '', price_modifier: '', stock: '' })
                      setShowOptionModal(true)
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Add Option"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingVariation(variation)
                      setVariationForm({
                        name: variation.name,
                        is_required: variation.is_required,
                        allow_custom: variation.allow_custom,
                      })
                      setShowVariationModal(true)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVariation(variation.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-2">
                {variation.options && variation.options.length > 0 ? (
                  variation.options.map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{option.value}</span>
                        {option.price_modifier > 0 && (
                          <span className="text-sm text-green-600 ml-2">+৳{option.price_modifier.toFixed(2)}</span>
                        )}
                        {option.stock !== undefined && (
                          <span className="text-sm text-gray-500 ml-2">(Stock: {option.stock})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedVariation(variation)
                            setEditingOption(option)
                            setOptionForm({
                              value: option.value,
                              price_modifier: option.price_modifier.toString(),
                              stock: option.stock.toString(),
                            })
                            setShowOptionModal(true)
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOption(variation.id, option.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No options added yet</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">No variations added yet</p>
            <button
              onClick={() => setShowVariationModal(true)}
              className="text-[#ff6b35] hover:underline"
            >
              Create your first variation
            </button>
          </div>
        )}
      </div>

      {/* Variation Modal */}
      {showVariationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingVariation ? 'Edit Variation' : 'Add Variation'}
              </h2>
              <button
                onClick={() => {
                  setShowVariationModal(false)
                  setEditingVariation(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateVariation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Variation Name</label>
                <input
                  type="text"
                  required
                  value={variationForm.name}
                  onChange={(e) => setVariationForm({ ...variationForm, name: e.target.value })}
                  placeholder="e.g., Color, Size, Material"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={variationForm.is_required}
                  onChange={(e) => setVariationForm({ ...variationForm, is_required: e.target.checked })}
                  className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <label className="text-sm text-gray-700">Required</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={variationForm.allow_custom}
                  onChange={(e) => setVariationForm({ ...variationForm, allow_custom: e.target.checked })}
                  className="rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <label className="text-sm text-gray-700">Allow Custom Value</label>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariationModal(false)
                    setEditingVariation(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  {editingVariation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && selectedVariation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOption ? 'Edit Option' : 'Add Option'} - {selectedVariation.name}
              </h2>
              <button
                onClick={() => {
                  setShowOptionModal(false)
                  setSelectedVariation(null)
                  setEditingOption(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOption} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Option Value</label>
                <input
                  type="text"
                  required
                  value={optionForm.value}
                  onChange={(e) => setOptionForm({ ...optionForm, value: e.target.value })}
                  placeholder="e.g., Red, Large, Cotton"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Modifier (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={optionForm.price_modifier}
                    onChange={(e) => setOptionForm({ ...optionForm, price_modifier: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                  <input
                    type="number"
                    value={optionForm.stock}
                    onChange={(e) => setOptionForm({ ...optionForm, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionModal(false)
                    setSelectedVariation(null)
                    setEditingOption(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a]"
                >
                  {editingOption ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

