'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  FiLogOut, FiCreditCard, FiShoppingCart, FiUsers, FiBarChart2, FiUserCheck
} from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'

export default function POSSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/admin/login')
  }

  const menuItems = [
    { name: 'POS System', href: '/admin/pos', icon: FiCreditCard },
    { name: 'POS Orders', href: '/admin/pos/orders', icon: FiShoppingCart },
    { name: 'Customers', href: '/admin/pos/customers', icon: FiUsers },
    { name: 'Stuffs', href: '/admin/pos/stuffs', icon: FiUserCheck },
    { name: 'Reports', href: '/admin/pos/reports', icon: FiBarChart2 },
  ]


  return (
    <aside className="w-48 bg-[#1e1e2e] min-h-screen fixed left-0 top-0 z-40 border-r border-gray-800 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-lg flex items-center justify-center">
            <FiCreditCard className="text-gray-200 text-base" />
          </div>
          <div>
            <span className="text-base font-bold text-gray-200 block">POS</span>
            <span className="text-[10px] text-gray-400">Point of Sale</span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <Link
        href="/admin/pos/profile"
        className="w-full p-2 border-b border-gray-800 hover:bg-gray-800 transition-colors text-left block"
      >
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-200 text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] text-gray-400 truncate capitalize">
              {user?.role || 'staff'}
            </p>
          </div>
        </div>
      </Link>

      {/* Main Menu */}
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          if (item.onClick) {
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className={`w-full flex items-center space-x-2 px-2 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#ff6b35] text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-2 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#ff6b35] text-gray-900'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Menu */}
      <div className="p-2 border-t border-gray-800 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-2 py-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          <FiLogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}

