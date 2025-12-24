'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import POSSidebar from '@/components/POSSidebar'
import AdminHeader from '@/components/AdminHeader'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  // POS pages use POSSidebar, except settings which uses AdminSidebar
  const isPOSPage = (pathname === '/admin/pos' || pathname?.startsWith('/admin/pos/')) && pathname !== '/admin/pos/settings'

  // Don't render sidebar and header on login page
  if (isLoginPage) {
    return <>{children}</>
  }

  // Use POS sidebar for POS page
  if (isPOSPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <POSSidebar />
        <div className="ml-48">
          <main className="h-screen">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // Default admin layout with AdminSidebar
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-64">
        <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
