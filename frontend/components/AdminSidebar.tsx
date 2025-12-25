'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  FiLayout, FiPackage, FiShoppingCart, FiUsers, FiBarChart2, 
  FiSettings, FiHome, FiTrendingUp, FiFileText, FiTag, FiLogOut, FiBell, FiCreditCard,
  FiChevronDown, FiChevronRight, FiEye, FiMessageCircle, FiHeadphones, FiTarget, FiSliders, FiEdit
} from 'react-icons/fi'

export default function AdminSidebar() {
  const pathname = usePathname()
  // Only open submenus if current path matches submenu items
  const [showPOSSubmenu, setShowPOSSubmenu] = useState(
    pathname === '/admin/pos' || pathname === '/admin/pos/settings' || pathname?.startsWith('/admin/pos/')
  )
  const [showReportsSubmenu, setShowReportsSubmenu] = useState(
    pathname?.startsWith('/admin/reports')
  )
  const [showSupportSubmenu, setShowSupportSubmenu] = useState(
    pathname?.startsWith('/admin/support')
  )

  // Update submenu states when pathname changes
  useEffect(() => {
    setShowPOSSubmenu(pathname === '/admin/pos' || pathname === '/admin/pos/settings' || pathname?.startsWith('/admin/pos/'))
    setShowReportsSubmenu(pathname?.startsWith('/admin/reports'))
    setShowSupportSubmenu(pathname?.startsWith('/admin/support'))
  }, [pathname])

  const handleOpenPOSInNewTab = () => {
    window.open('/admin/pos', '_blank')
  }

  const menuItems = [
    { name: 'Products', href: '/admin/products', icon: FiPackage },
    { name: 'Orders', href: '/admin/orders', icon: FiShoppingCart },
    { name: 'Customers', href: '/admin/customers', icon: FiUsers },
    { name: 'Categories', href: '/admin/categories', icon: FiTag },
    { name: 'Inventory', href: '/admin/inventory', icon: FiPackage },
    { name: 'Coupons', href: '/admin/coupons', icon: FiTag },
    { name: 'Sales', href: '/admin/sales', icon: FiTrendingUp },
    { name: 'Users', href: '/admin/users', icon: FiUsers },
    { name: 'Campaigns', href: '/admin/campaigns', icon: FiTarget },
    { name: 'Page Builder', href: '/admin/page-builder', icon: FiEdit },
    { name: 'Customization', href: '/admin/customization', icon: FiSliders },
    { name: 'Payment Gateways', href: '/admin/payment-gateways', icon: FiCreditCard },
    { name: 'Settings', href: '/admin/settings', icon: FiSettings },
  ]

  return (
    <aside className="w-64 bg-[#1e1e2e] min-h-screen fixed left-0 top-0 z-40 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-lg flex items-center justify-center">
            <FiLayout className="text-gray-200 text-lg" />
          </div>
          <span className="text-lg font-bold text-gray-200">EcomStore</span>
        </Link>
      </div>

      <nav className="p-3 space-y-1">
        {/* Dashboard Menu Item */}
        <Link
          href="/admin/dashboard"
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            pathname === '/admin/dashboard' || pathname?.startsWith('/admin/dashboard/')
              ? 'bg-[#ff6b35] text-gray-900'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <FiHome className="w-4 h-4" />
          <span className="font-medium text-sm">Dashboard</span>
        </Link>

        {/* POS Submenu */}
        <div>
          <button
            onClick={() => setShowPOSSubmenu(!showPOSSubmenu)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              pathname === '/admin/pos' || pathname === '/admin/pos/settings' || pathname?.startsWith('/admin/pos/')
                ? 'bg-[#ff6b35] text-gray-900'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FiCreditCard className="w-4 h-4" />
              <span className="font-medium text-sm">POS</span>
            </div>
            {showPOSSubmenu ? (
              <FiChevronDown className="w-3 h-3" />
            ) : (
              <FiChevronRight className="w-3 h-3" />
            )}
          </button>
          
          {showPOSSubmenu && (
            <div className="ml-3 mt-1 space-y-1">
              <button
                onClick={handleOpenPOSInNewTab}
                className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/pos'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiEye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
              <Link
                href="/admin/pos/settings"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/pos/settings'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiSettings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>
            </div>
          )}
        </div>

        {/* Reports Submenu */}
        <div>
          <button
            onClick={() => setShowReportsSubmenu(!showReportsSubmenu)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              pathname?.startsWith('/admin/reports')
                ? 'bg-[#ff6b35] text-gray-900'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FiBarChart2 className="w-4 h-4" />
              <span className="font-medium text-sm">Reports</span>
            </div>
            {showReportsSubmenu ? (
              <FiChevronDown className="w-3 h-3" />
            ) : (
              <FiChevronRight className="w-3 h-3" />
            )}
          </button>
          
          {showReportsSubmenu && (
            <div className="ml-3 mt-1 space-y-1">
              <Link
                href="/admin/reports/overview"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/reports/overview'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiFileText className="w-3.5 h-3.5" />
                <span>Overview</span>
              </Link>
              <Link
                href="/admin/reports/products"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/reports/products'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiPackage className="w-3.5 h-3.5" />
                <span>Products</span>
              </Link>
              <Link
                href="/admin/reports/orders"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/reports/orders'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiShoppingCart className="w-3.5 h-3.5" />
                <span>Orders</span>
              </Link>
              <Link
                href="/admin/reports/users"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/reports/users'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiUsers className="w-3.5 h-3.5" />
                <span>Users</span>
              </Link>
              <Link
                href="/admin/reports/supports"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/reports/supports'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiHeadphones className="w-3.5 h-3.5" />
                <span>Supports</span>
              </Link>
              <Link
                href="/admin/reports/campaigns"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/reports/campaigns'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiTarget className="w-3.5 h-3.5" />
                <span>Campaigns</span>
              </Link>
            </div>
          )}
        </div>

        {/* Support Submenu */}
        <div>
          <button
            onClick={() => setShowSupportSubmenu(!showSupportSubmenu)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              pathname?.startsWith('/admin/support')
                ? 'bg-[#ff6b35] text-gray-900'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FiHeadphones className="w-4 h-4" />
              <span className="font-medium text-sm">Support</span>
            </div>
            {showSupportSubmenu ? (
              <FiChevronDown className="w-3 h-3" />
            ) : (
              <FiChevronRight className="w-3 h-3" />
            )}
          </button>
          
          {showSupportSubmenu && (
            <div className="ml-3 mt-1 space-y-1">
              <Link
                href="/admin/support/chats"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/support/chats'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiMessageCircle className="w-3.5 h-3.5" />
                <span>Chats</span>
              </Link>
              <Link
                href="/admin/support/tickets"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${
                  pathname === '/admin/support/tickets'
                    ? 'bg-gray-800 text-gray-200'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FiFileText className="w-3.5 h-3.5" />
                <span>Tickets</span>
              </Link>
            </div>
          )}
        </div>

        {/* Other Menu Items */}
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#ff6b35] text-gray-900'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

