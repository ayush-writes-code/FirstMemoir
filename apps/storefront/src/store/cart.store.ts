import { create } from 'zustand';
import { cart as cartApi } from '@/lib/api-client';
import type { CartDto, CartLineItemDto, AddToCartInput } from '@/lib/api-client';

interface CartState {
  cart: CartDto | null;
  isLoading: boolean;
  mutatingItemIds: string[];
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
  mutatingItemIds: [],
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
      if (response.success && response.data) {
        const currentCart = get().cart;
        if (currentCart) {
          const itemIndex = currentCart.items.findIndex((i: CartLineItemDto) => i.id === response.data!.id);
          const updatedItems = itemIndex >= 0
            ? currentCart.items.map((it: CartLineItemDto, idx: number) => idx === itemIndex ? response.data! : it)
            : [...currentCart.items, response.data!];
          set({
            cart: {
              ...currentCart,
              items: updatedItems,
            },
            isLoading: false,
          });
        } else {
          // If cart was not yet in memory, fetch complete cart
          await get().fetchCart();
        }
      } else {
        set({ error: response.error || 'Failed to add to cart', isLoading: false });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateQuantity: async (lineItemId, quantity) => {
    const currentCart = get().cart;
    if (!currentCart) return;

    const itemToUpdate = currentCart.items.find((i: CartLineItemDto) => i.id === lineItemId);
    if (!itemToUpdate) return;

    // Validate bounds (1 to 999 enforced by backend Zod schema)
    if (quantity < 1 || quantity > 999) return;

    const previousQuantity = itemToUpdate.quantity;
    if (previousQuantity === quantity) return;

    // Prevent concurrent duplicate submissions on the same line item
    const currentMutating = get().mutatingItemIds || [];
    if (currentMutating.includes(lineItemId)) return;

    // 1. Optimistic Update: Immediately reflect new quantity and recalculate subtotal in UI
    const optimisticItems = currentCart.items.map((item: CartLineItemDto) =>
      item.id === lineItemId ? { ...item, quantity } : item
    );
    set({
      cart: {
        ...currentCart,
        items: optimisticItems
      },
      mutatingItemIds: [...currentMutating, lineItemId],
      error: null
    });

    // 2. Perform background server update without freezing entire cart
    try {
      const response = await cartApi.updateCartItemQuantity(lineItemId, quantity);
      const remainingMutating = (get().mutatingItemIds || []).filter((id: string) => id !== lineItemId);

      if (response.success && response.data) {
        // Reconcile with server-authoritative response
        const latestCart = get().cart;
        if (latestCart) {
          const reconciledItems = latestCart.items.map((item: CartLineItemDto) =>
            item.id === lineItemId ? response.data! : item
          );
          set({
            cart: {
              ...latestCart,
              items: reconciledItems
            },
            mutatingItemIds: remainingMutating
          });
        }
      } else {
        // Rollback on failure
        const rollbackCart = get().cart;
        if (rollbackCart) {
          const rolledBackItems = rollbackCart.items.map((item: CartLineItemDto) =>
            item.id === lineItemId ? { ...item, quantity: previousQuantity } : item
          );
          set({
            cart: {
              ...rollbackCart,
              items: rolledBackItems
            },
            mutatingItemIds: remainingMutating,
            error: response.error || 'Failed to update quantity'
          });
        }
      }
    } catch (error: unknown) {
      // Rollback on network exception
      const remainingMutating = (get().mutatingItemIds || []).filter((id: string) => id !== lineItemId);
      const rollbackCart = get().cart;
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (rollbackCart) {
        const rolledBackItems = rollbackCart.items.map((item: CartLineItemDto) =>
          item.id === lineItemId ? { ...item, quantity: previousQuantity } : item
        );
        set({
          cart: {
            ...rollbackCart,
            items: rolledBackItems
          },
          mutatingItemIds: remainingMutating,
          error: errorMessage
        });
      } else {
        set({ mutatingItemIds: remainingMutating, error: errorMessage });
      }
    }
  },

  removeItem: async (lineItemId) => {
    const currentCart = get().cart;
    if (!currentCart) return;

    const previousItems = currentCart.items;
    const currentMutating = get().mutatingItemIds || [];
    if (currentMutating.includes(lineItemId)) return;

    // Optimistically remove item from UI immediately
    const optimisticItems = previousItems.filter((i: CartLineItemDto) => i.id !== lineItemId);
    set({
      cart: {
        ...currentCart,
        items: optimisticItems
      },
      mutatingItemIds: [...currentMutating, lineItemId],
      error: null
    });

    try {
      const response = await cartApi.removeFromCart(lineItemId);
      const remainingMutating = (get().mutatingItemIds || []).filter((id: string) => id !== lineItemId);

      if (response.success) {
        set({ mutatingItemIds: remainingMutating });
      } else {
        // Rollback on failure
        const rollbackCart = get().cart;
        if (rollbackCart) {
          set({
            cart: {
              ...rollbackCart,
              items: previousItems
            },
            mutatingItemIds: remainingMutating,
            error: response.error || 'Failed to remove item'
          });
        }
      }
    } catch (error: unknown) {
      const remainingMutating = (get().mutatingItemIds || []).filter((id: string) => id !== lineItemId);
      const rollbackCart = get().cart;
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (rollbackCart) {
        set({
          cart: {
            ...rollbackCart,
            items: previousItems
          },
          mutatingItemIds: remainingMutating,
          error: errorMessage
        });
      } else {
        set({ mutatingItemIds: remainingMutating, error: errorMessage });
      }
    }
  },
  
  clearCart: () => {
    set({ cart: null, mutatingItemIds: [], error: null });
  },
}));
