import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types/index.ts';

export interface Transaction extends CartItem {
  transactionId: string;
  studentId: string;
  studentName: string;
  date: string;
  returnDate?: string;
  collegeCode: string;
}

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (items: CartItem[], student: { id: string, name: string }, collegeCode: string) => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (items, student, collegeCode) => {
        const date = new Date().toISOString();
        const newTransactions = items.map((item) => {
          let returnDate: string | undefined;
          if (item.action === 'borrow' && item.duration) {
            const rDate = new Date();
            rDate.setDate(rDate.getDate() + item.duration);
            returnDate = rDate.toISOString();
          }
          return {
            ...item,
            transactionId: Math.random().toString(36).substr(2, 9).toUpperCase(),
            studentId: student.id,
            studentName: student.name,
            date,
            returnDate,
            collegeCode,
          };
        });
        set((state) => ({ transactions: [...newTransactions, ...state.transactions] }));
      },
    }),
    {
      name: 'geo-attendance-all-transactions',
    }
  )
);
