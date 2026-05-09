import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getBooks = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('books').get();
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (books.length === 0) {
        return res.json(INITIAL_BOOKS);
    }

    res.json(books);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createBook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const docRef = await db.collection('books').add({
      ...payload,
      createdAt: new Date().toISOString()
    });
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('books').doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('books').doc(id).delete();
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const INITIAL_BOOKS = [
  {
    id: 'b1',
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
    id: 'b2',
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
    id: 'b3',
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
    id: 'b4',
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
    id: 'b5',
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
    id: 'b6',
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
