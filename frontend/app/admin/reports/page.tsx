'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

export default function AdminReportsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()

  useEffect(() => {
    if (!user || !token) {
      router.push('/admin/login')
      return
    }
    // Redirect to overview by default
    router.push('/admin/reports/overview')
  }, [user, token, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Redirecting to Reports Overview...</p>
      </div>
    </div>
  )
}

