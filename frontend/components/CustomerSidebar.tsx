'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiPackage, FiHeart, FiUser, FiLock, FiLogOut } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

export default function CustomerSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const menuItems = [
    {
      name: 'My Orders',
      href: '/orders',
      icon: FiPackage,
    },
    {
      name: 'Wishlist',
      href: '/account/wishlist',
      icon: FiHeart,
    },
    {
      name: 'Profile Information',
      href: '/account/profile',
      icon: FiUser,
    },
    {
      name: 'Security',
      href: '/account/security',
      icon: FiLock,
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">My Account</h2>
        <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
      </div>
      
      <nav className="p-4 space-y-2 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#ff6b35] text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <FiLogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}

