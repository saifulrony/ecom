'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiTag, FiUpload, FiX, FiImage } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { productAPI, adminAPI, Category } from '@/lib/api'

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', image: '' })
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    fetchCategories()
  }, [user, token, router])

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await adminAPI.uploadImage(formData)
      let url = response.data.url
      // If relative path, prepend backend base URL (without /api)
      if (url.startsWith('/uploads/')) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        const port = '10000'
        url = `http://${hostname}:${port}${url}`
      }
      return url
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload image')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const url = await handleImageUpload(file)
    if (url) {
      setFormData(prev => ({ ...prev, image: url }))
      setImagePreview(url)
    }
  }

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: '' }))
    setImagePreview('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await adminAPI.updateCategory(editingCategory.id, formData)
      } else {
        await adminAPI.createCategory(formData)
      }
      setShowModal(false)
      setEditingCategory(null)
      setFormData({ name: '', slug: '', image: '' })
      setImagePreview('')
      fetchCategories()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save category')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await adminAPI.deleteCategory(id)
      fetchCategories()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete category')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({ 
      name: category.name, 
      slug: category.slug,
      image: category.image || ''
    })
    setImagePreview(category.image || '')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData({ name: '', slug: '', image: '' })
    setImagePreview('')
  }

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null
    // If already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }
    // If relative path, construct full URL
    if (imageUrl.startsWith('/uploads/')) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const port = '10000'
      return `http://${hostname}:${port}${imageUrl}`
    }
    return imageUrl
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.slug.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage product categories</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null)
            setFormData({ name: '', slug: '', image: '' })
            setImagePreview('')
            setShowModal(true)
          }}
          className="flex items-center justify-center space-x-2 bg-[#ff6b35] text-gray-900 px-4 py-2 rounded-lg hover:bg-[#ff8c5a] transition w-full sm:w-auto"
        >
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Add Category</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => {
            const imageUrl = getImageUrl(category.image)
            return (
              <div 
                key={category.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition"
              >
                <div className="flex flex-col space-y-4">
                  {/* Image or Icon */}
                  <div className="relative w-full h-32 sm:h-40 bg-gray-100 rounded-lg overflow-hidden">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={category.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiTag className="w-8 h-8 sm:w-12 sm:h-12 text-[#ff6b35] opacity-50" />
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{category.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{category.slug}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      aria-label="Edit category"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      aria-label="Delete category"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
            No categories found
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Image
                </label>
                {imagePreview || formData.image ? (
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <Image
                      src={imagePreview || formData.image}
                      alt="Preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 400px"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                      aria-label="Remove image"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-[#ff6b35] transition">
                    <FiImage className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
                    <label className="cursor-pointer">
                      <span className="text-sm sm:text-base text-gray-600 block mb-2">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 block mb-3">
                        PNG, JPG, GIF up to 10MB
                      </span>
                      <div className="inline-flex items-center space-x-2 bg-[#ff6b35] text-white px-4 py-2 rounded-lg hover:bg-[#ff8c5a] transition">
                        <FiUpload className="w-4 h-4" />
                        <span className="text-sm">Choose File</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    {uploading && (
                      <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-sm sm:text-base bg-[#ff6b35] text-gray-900 rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {uploading ? 'Uploading...' : editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
