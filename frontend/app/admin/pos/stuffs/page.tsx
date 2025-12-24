'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUserCheck, FiSearch, FiMail, FiPhone, FiUser, FiCalendar, FiMapPin, FiShield } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'

interface Staff {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  role: string
  created_at?: string
}

export default function POSStuffsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [stuffs, setStuffs] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      if (user && token) {
        const userRole = user.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }
        fetchStuffs()
        return
      }

      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!storedToken) {
        router.push('/admin/login')
        return
      }

      const timer = setTimeout(async () => {
        const currentUser = useAuthStore.getState().user
        const currentToken = useAuthStore.getState().token
        
        if (!currentUser || !currentToken) {
          try {
            const { authAPI } = await import('@/lib/api')
            const profileResponse = await authAPI.getProfile()
            const profileUser = profileResponse.data
            const userRole = profileUser.role?.toLowerCase()
            
            if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
              router.push('/admin/login')
              return
            }
            
            useAuthStore.getState().setAuth(profileUser, storedToken)
            fetchStuffs()
          } catch (err) {
            console.error('Failed to fetch profile:', err)
            router.push('/admin/login')
          }
          return
        }

        const userRole = currentUser.role?.toLowerCase()
        if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
          router.push('/admin/login')
          return
        }

        fetchStuffs()
      }, 100)

      return () => clearTimeout(timer)
    }

    checkAuth()
  }, [user, token, router])

  const fetchStuffs = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getUsers()
      const allUsers = response.data?.users || []
      // Filter to show only staff members (admin, staff, manager roles, exclude regular users)
      const staffMembers = allUsers.filter((user: Staff) => 
        user.role && ['admin', 'staff', 'manager'].includes(user.role.toLowerCase())
      )
      setStuffs(staffMembers)
    } catch (error: any) {
      console.error('Failed to fetch stuffs:', error)
      if (error.response?.status === 404) {
        setStuffs([])
      }
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-purple-100 text-purple-800'
      case 'staff': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredStuffs = stuffs.filter(staff => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch = (
        staff.name?.toLowerCase().includes(searchLower) ||
        staff.email?.toLowerCase().includes(searchLower) ||
        staff.phone?.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }

    // Role filter
    if (roleFilter && staff.role?.toLowerCase() !== roleFilter.toLowerCase()) {
      return false
    }

    return true
  })

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stuffs</h1>
            <p className="text-sm text-gray-600 mt-1">Manage staff members</p>
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{filteredStuffs.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4 flex-wrap lg:flex-nowrap gap-2">
          {/* Search - First */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <FiShield className="w-4 h-4 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-gray-900 bg-white"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stuffs Table */}
      <div className="flex-1 overflow-y-auto">
        {filteredStuffs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center m-6">
            <FiUserCheck className="mx-auto text-6xl text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No staff members found</h2>
            <p className="text-gray-600">
              {search || roleFilter ? 'Try adjusting your filters' : 'No staff members in the database yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto m-6">
            <table className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Member Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStuffs.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {staff.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FiMail className="w-4 h-4" />
                        <span>{staff.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {staff.phone ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiPhone className="w-4 h-4" />
                          <span>{staff.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleColor(staff.role)}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {staff.address ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiMapPin className="w-4 h-4" />
                          <span>{staff.address}{staff.city ? `, ${staff.city}` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {staff.created_at ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiCalendar className="w-4 h-4" />
                          <span>{new Date(staff.created_at).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

