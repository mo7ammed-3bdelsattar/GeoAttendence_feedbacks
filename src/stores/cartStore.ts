import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book, CartItem, CartAction } from '../types/index.ts';

interface CartState {
  items: CartItem[];
  addItem: (book: Book, action: CartAction) => void;
  removeItem: (bookId: string, action: CartAction) => void;
  updateQuantity: (bookId: string, action: CartAction, quantity: number) => void;
  updateDuration: (bookId: string, duration: number) => void;
  clearCart: () => void;
  totalPrice: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (book, action) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === book.id && item.action === action);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                (item.id === book.id && item.action === action)
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return { items: [...state.items, { ...book, quantity: 1, action, duration: action === 'borrow' ? 1 : undefined }] };
        });
      },
      removeItem: (bookId, action) => {
        set((state) => ({
          items: state.items.filter((item) => !(item.id === bookId && item.action === action)),
        }));
      },
      updateQuantity: (bookId, action, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            (item.id === bookId && item.action === action)
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        }));
      },
      updateDuration: (bookId, duration) => {
        set((state) => ({
          items: state.items.map((item) =>
            (item.id === bookId && item.action === 'borrow')
              ? { ...item, duration: Math.min(10, Math.max(1, duration)) }
              : item
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      totalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.action === 'buy' 
            ? item.price 
            : (item.borrowPrice ?? 0) * (item.duration ?? 1);
          return total + price * item.quantity;
        }, 0);
      },
      totalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'geo-attendance-cart',
    }
  )
);
