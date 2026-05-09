import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book } from '../types/index.ts';

const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'Modern Software Engineering',
    author: 'David Farley',
    price: 45.99,
    borrowPrice: 5.00,
    isBorrowable: true,
    description: 'A guide to modern software engineering practices.',
    category: 'Computer Science',
    coverImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '2',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt, David Thomas',
    price: 39.99,
    borrowPrice: 4.50,
    isBorrowable: true,
    description: 'Your journey to mastery.',
    category: 'Computer Science',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '3',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    price: 42.50,
    borrowPrice: 4.00,
    isBorrowable: true,
    description: 'A handbook of agile software craftsmanship.',
    category: 'Computer Science',
    coverImage: 'https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '4',
    title: 'Deep Learning',
    author: 'Ian Goodfellow',
    price: 75.00,
    borrowPrice: 10.00,
    isBorrowable: true,
    description: 'An introduction to deep learning.',
    category: 'AI & Data Science',
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '5',
    title: 'Atomic Habits',
    author: 'James Clear',
    price: 18.00,
    borrowPrice: 2.00,
    isBorrowable: true,
    description: 'An easy & proven way to build good habits & break bad ones.',
    category: 'Personal Development',
    coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '6',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    price: 22.00,
    borrowPrice: 3.00,
    isBorrowable: true,
    description: 'A book about how we think.',
    category: 'Psychology',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
  },
];

interface BooksState {
  books: Book[];
  addBook: (book: Omit<Book, 'id'>) => void;
  updateBook: (id: string, book: Partial<Book>) => void;
  deleteBook: (id: string) => void;
}

export const useBooksStore = create<BooksState>()(
  persist(
    (set) => ({
      books: INITIAL_BOOKS,
      addBook: (book) => {
        set((state) => ({
          books: [
            ...state.books,
            { ...book, id: Math.random().toString(36).substr(2, 9) } as Book,
          ],
        }));
      },
      updateBook: (id, updatedBook) => {
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? { ...b, ...updatedBook } : b)),
        }));
      },
      deleteBook: (id) => {
        set((state) => ({
          books: state.books.filter((b) => b.id !== id),
        }));
      },
    }),
    {
      name: 'geo-attendance-books',
    }
  )
);
