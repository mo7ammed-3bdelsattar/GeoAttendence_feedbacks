import { useState, useMemo } from 'react';
import { Search, ShoppingCart, Filter, Book as BookIcon, RotateCcw } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useCartStore } from '../../stores/cartStore.ts';
import { useBooksStore } from '../../stores/booksStore.ts';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Book, CartAction } from '../../types/index.ts';

const CATEGORIES = ['All', 'Computer Science', 'AI & Data Science', 'Personal Development', 'Psychology'];

export function StudentBookStorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const books = useBooksStore((s) => s.books);
  const addItem = useCartStore((s) => s.addItem);
  const totalItems = useCartStore((s) => s.totalItems());

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchQuery, selectedCategory]);

  const handleAction = (book: Book, action: CartAction) => {
    addItem(book, action);
    const msg = action === 'buy' ? `Added "${book.title}" to cart` : `Added "${book.title}" for borrowing`;
    toast.success(msg);
  };

  return (
    <AppShell title="Book Store">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search books or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to="/student/cart"
              className="relative p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ShoppingCart className="h-6 w-6 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Filter className="h-4 w-4 text-gray-500 mr-2 shrink-0" />
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary/40'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <div key={book.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[10px] font-bold text-primary uppercase tracking-wider shadow-sm">
                      {book.category}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 line-clamp-1">{book.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">by {book.author}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{book.description}</p>
                  
                  <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-gray-50">
                    {/* Buy Option */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium">Buy</span>
                        <span className="text-lg font-extrabold text-primary">${book.price.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => handleAction(book, 'buy')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to Cart
                      </button>
                    </div>

                    {/* Borrow Option */}
                    {book.isBorrowable && (
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 font-medium">Borrow</span>
                          <span className="text-sm font-bold text-emerald-600">${book.borrowPrice?.toFixed(2)}<span className="text-[10px] font-medium">/wk</span></span>
                        </div>
                        <button
                          onClick={() => handleAction(book, 'borrow')}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Borrow
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-50 mb-4">
                <BookIcon className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No books found</h3>
              <p className="text-gray-500">Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>

        {/* Floating Cart Button for Mobile */}
        <Link
          to="/student/cart"
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center z-50 animate-in zoom-in slide-in-from-bottom-10 duration-300"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </AppShell>
  );
}
