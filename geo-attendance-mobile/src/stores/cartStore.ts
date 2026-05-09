import { create } from 'zustand';
import type { Book, CartItem, CartAction } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (book: Book, action: CartAction) => void;
  removeItem: (bookId: string, action: CartAction) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (book, action) => {
    const { items } = get();
    const existingIndex = items.findIndex(i => i.id === book.id && i.action === action);
    
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      set({ items: newItems });
    } else {
      set({ items: [...items, { ...book, quantity: 1, action }] });
    }
  },
  
  removeItem: (bookId, action) => {
    const { items } = get();
    const existingIndex = items.findIndex(i => i.id === bookId && i.action === action);
    
    if (existingIndex > -1) {
      const newItems = [...items];
      if (newItems[existingIndex].quantity > 1) {
        newItems[existingIndex].quantity -= 1;
      } else {
        newItems.splice(existingIndex, 1);
      }
      set({ items: newItems });
    }
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const price = item.action === 'buy' ? item.price : (item.borrowPrice || 0);
      return sum + (price * item.quantity);
    }, 0);
  },
}));
