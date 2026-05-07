import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types/index.ts';

export interface HistoryItem extends CartItem {
  purchaseDate: string;
  returnDate?: string; // For borrowed items
}

interface HistoryState {
  history: HistoryItem[];
  addItems: (items: CartItem[]) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      addItems: (newItems) => {
        const purchaseDate = new Date().toISOString();
        const itemsWithDates = newItems.map((item) => {
          let returnDate: string | undefined;
          if (item.action === 'borrow' && item.duration) {
            const date = new Date();
            date.setDate(date.getDate() + item.duration);
            returnDate = date.toISOString();
          }
          return {
            ...item,
            purchaseDate,
            returnDate,
          };
        });
        set((state) => ({ history: [...itemsWithDates, ...state.history] }));
      },
    }),
    {
      name: 'geo-attendance-history',
    }
  )
);
