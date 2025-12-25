'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { authAPI } from '@/lib/api'
import { FiUser, FiMail, FiPhone, FiMapPin, FiCamera, FiSave, FiX } from 'react-icons/fi'
import Image from 'next/image'

export default function ProfilePage() {
  const router = useRouter()
  const { user: authUser, setAuth } = useAuthStore()
  const { isAuthenticated } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    image: '',
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper function to get API URL
  const getAPIUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      return `http://${hostname}:10000`
    }
    return 'http://localhost:10000'
  }

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile()
        const userData = response.data.user
        console.log('Fetched profile data:', userData)
        console.log('Image from API:', userData.image)
        
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          city: userData.city || '',
          postal_code: userData.postal_code || '',
          country: userData.country || '',
          image: userData.image || '',
        })
        // Set preview image from saved profile image
        // Always set previewImage from the fetched data to ensure it persists on reload
        if (userData.image && userData.image.trim() !== '') {
          const imageUrl = userData.image.startsWith('http') 
            ? userData.image 
            : `${getAPIUrl()}${userData.image}`
          console.log('Setting previewImage to:', imageUrl)
          setPreviewImage(imageUrl)
        } else {
          console.log('No valid image in userData - image value:', userData.image, 'type:', typeof userData.image)
          // Clear previewImage only if we're sure there's no image
          setPreviewImage(null)
        }
      } catch (error: any) {
        console.error('Failed to fetch profile:', error)
        if (error.response?.status === 401 || error.response?.status === 403) {
          router.push('/admin/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [isAuthenticated, router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData()
      
      // Add image if a new one was selected
      if (fileInputRef.current?.files?.[0]) {
        formData.append('image', fileInputRef.current.files[0])
      }

      // Add other fields
      formData.append('name', profile.name)
      formData.append('email', profile.email)
      if (profile.phone) formData.append('phone', profile.phone)
      if (profile.address) formData.append('address', profile.address)
      if (profile.city) formData.append('city', profile.city)
      if (profile.postal_code) formData.append('postal_code', profile.postal_code)
      if (profile.country) formData.append('country', profile.country)

      const response = await authAPI.updateProfile(formData)
      const updatedUser = response.data.user

      // Update local profile state with the saved data
      setProfile({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        address: updatedUser.address || '',
        city: updatedUser.city || '',
        postal_code: updatedUser.postal_code || '',
        country: updatedUser.country || '',
        image: updatedUser.image || '',
      })

      // Store whether we had a new image before clearing the file input
      const hadNewImage = !!fileInputRef.current?.files?.[0]
      
      // Clear file input after successful save (before updating preview)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Update preview image from the saved profile
      // Always use the image from the response (whether new or existing)
      console.log('Profile update response:', updatedUser)
      console.log('Image in response:', updatedUser.image)
      console.log('Had new image:', hadNewImage)
      console.log('Current previewImage before update:', previewImage)
      
      // Always update previewImage from the response if it has an image
      if (updatedUser.image && updatedUser.image.trim() !== '') {
        const imageUrl = updatedUser.image.startsWith('http') 
          ? updatedUser.image 
          : `${getAPIUrl()}${updatedUser.image}`
        console.log('Setting previewImage to:', imageUrl)
        setPreviewImage(imageUrl)
      } else if (hadNewImage) {
        // We uploaded a new image but got no image in response - something went wrong
        console.warn('Image upload may have failed - image not in response')
        // Keep the base64 preview from handleImageChange so user can see what they selected
        // Don't clear previewImage
      } else {
        // No new image uploaded and no image in response
        // This means the user updated other fields but the backend didn't return the existing image
        // Try to preserve the existing previewImage if it exists
        if (!previewImage && profile.image && profile.image.trim() !== '') {
          // If previewImage is null but profile.image has a value, reconstruct it
          const imageUrl = profile.image.startsWith('http') 
            ? profile.image 
            : `${getAPIUrl()}${profile.image}`
          console.log('Reconstructing previewImage from profile.image:', imageUrl)
          setPreviewImage(imageUrl)
        } else {
          console.log('No image in response, keeping existing previewImage:', previewImage)
        }
      }

      // Update auth store with new user data
      if (authUser) {
        setAuth(
          {
            ...authUser,
            name: updatedUser.name,
            email: updatedUser.email,
            image: updatedUser.image,
          },
          localStorage.getItem('token') || ''
        )
      }

      alert('Profile updated successfully!')
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      alert(error.response?.data?.error || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  // Construct image URL: use previewImage if available (for new uploads), otherwise use saved profile image
  // This ensures the image is always shown even if previewImage is temporarily null during state updates
  const imageUrl = previewImage || (profile.image && profile.image.trim() !== '' ? (profile.image.startsWith('http') ? profile.image : `${getAPIUrl()}${profile.image}`) : null)
  
  // Debug logging (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Render - imageUrl:', imageUrl)
    console.log('Render - previewImage:', previewImage)
    console.log('Render - profile.image:', profile.image)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Section */}
          <div className="flex items-start space-x-6 pb-6 border-b border-gray-200">
            <div className="relative">
              {imageUrl ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                  <Image
                    src={imageUrl}
                    alt={profile.name || 'Profile'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-[#ff6b35] rounded-full flex items-center justify-center border-4 border-gray-200">
                  <span className="text-white text-4xl font-bold">
                    {profile.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#ff6b35] text-white rounded-full p-2 shadow-lg hover:bg-[#ff8c5a] transition"
                title="Change profile picture"
              >
                <FiCamera className="w-4 h-4" />
              </button>
              {previewImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition"
                  title="Remove image"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Picture</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a profile picture. JPG, PNG, or GIF. Max 5MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                Choose Image
              </button>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiUser className="inline w-4 h-4 mr-1" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMail className="inline w-4 h-4 mr-1" />
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiPhone className="inline w-4 h-4 mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline w-4 h-4 mr-1" />
                Country
              </label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline w-4 h-4 mr-1" />
                City
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline w-4 h-4 mr-1" />
                Postal Code
              </label>
              <input
                type="text"
                value={profile.postal_code}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiMapPin className="inline w-4 h-4 mr-1" />
              Address
            </label>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent text-gray-900 bg-white"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ff8c5a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <FiSave className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

