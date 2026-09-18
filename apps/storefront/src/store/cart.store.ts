import { create } from 'zustand';
import { cart as cartApi } from '@/lib/api-client';
import type { CartDto, AddToCartInput } from '@/lib/api-client';

interface CartState {
  cart: CartDto | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (payload: AddToCartInput) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.getCart();
      if (response.success && response.data) {
        set({ cart: response.data, isLoading: false });
      } else {
        set({ error: response.error || 'Failed to fetch cart', isLoading: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  addToCart: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.addToCart(payload);
      if (response.success) {
        // Optimistically or explicitly refresh cart
        await get().fetchCart();
      } else {
        set({ error: response.error || 'Failed to add to cart', isLoading: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateQuantity: async (lineItemId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.updateCartItemQuantity(lineItemId, quantity);
      if (response.success) {
        await get().fetchCart();
      } else {
        set({ error: response.error || 'Failed to update quantity', isLoading: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  removeItem: async (lineItemId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.removeFromCart(lineItemId);
      if (response.success) {
        await get().fetchCart();
      } else {
        set({ error: response.error || 'Failed to remove item', isLoading: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  clearCart: () => {
    set({ cart: null, error: null });
  },
}));
