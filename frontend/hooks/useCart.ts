import { useEffect } from 'react'
import { cartAPI } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'

export function useCart() {
  const { user } = useAuthStore()
  const { setCart } = useCartStore()

  useEffect(() => {
    if (user) {
      const fetchCart = async () => {
        try {
          const response = await cartAPI.getCart()
          setCart(response.data.items, response.data.total)
        } catch (error) {
          console.error('Failed to fetch cart:', error)
        }
      }
      fetchCart()
    }
  }, [user, setCart])
}

