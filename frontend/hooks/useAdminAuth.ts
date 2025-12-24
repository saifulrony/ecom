import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

/**
 * Hook to protect admin routes - waits for auth store hydration before checking auth
 * Redirects to login if user is not authenticated or doesn't have admin role
 * Skips protection on login page
 */
export function useAdminAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, hasHydrated } = useAuthStore()
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    // Skip protection on login page
    if (isLoginPage) {
      return
    }

    // Wait for store to hydrate from localStorage before checking auth
    if (!hasHydrated) {
      return
    }

    if (!user || !token) {
      router.push('/admin/login')
      return
    }

    const userRole = user.role?.toLowerCase()
    if (!userRole || !['admin', 'staff', 'manager'].includes(userRole)) {
      router.push('/admin/login')
      return
    }
  }, [user, token, router, hasHydrated, isLoginPage])

  return { user, token, isAuthenticated: !!user && !!token && hasHydrated }
}

