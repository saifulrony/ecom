import { create } from 'zustand'
import { CartItem } from '@/lib/api'

interface CartState {
  items: CartItem[]
  total: number
  setCart: (items: CartItem[], total: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  setCart: (items, total) => set({ items, total }),
  clearCart: () => set({ items: [], total: 0 }),
}))

