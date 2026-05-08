import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, Image as ImageIcon } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useBooksStore } from '../../stores/booksStore.ts';
import toast from 'react-hot-toast';
import type { Book } from '../../types/index.ts';

const CATEGORIES = ['Computer Science', 'AI & Data Science', 'Personal Development', 'Psychology', 'Mathematics', 'Engineering'];

export function AdminBooksPage() {
  const { books, addBook, updateBook, deleteBook } = useBooksStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Book, 'id'>>({
    title: '',
    author: '',
    price: 0,
    borrowPrice: 0,
    isBorrowable: true,
    description: '',
    category: CATEGORIES[0],
    coverImage: '',
  });

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBook) {
      updateBook(editingBook.id, formData);
      toast.success('Book updated successfully');
      setEditingBook(null);
    } else {
      addBook(formData);
      toast.success('Book added successfully');
      setIsAdding(false);
    }
    setFormData({
      title: '', author: '', price: 0, borrowPrice: 0, 
      isBorrowable: true, description: '', category: CATEGORIES[0], coverImage: ''
    });
  };

  const startEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({ ...book });
    setIsAdding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      deleteBook(id);
      toast.success('Book deleted');
    }
  };

  return (
    <AppShell title="Manage Books">
      <div className="space-y-6">
        {/* Mobile-friendly Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 hidden md:block">Library Management</h2>
            <button
              onClick={() => { setIsAdding(true); setEditingBook(null); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="h-5 w-5" />
              <span>Add New</span>
            </button>
          </div>
          
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
          {/* Main Content Area */}
          <div className="space-y-4">
            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Book</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Prices</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={book.coverImage} className="h-10 w-8 object-cover rounded shadow-sm group-hover:scale-110 transition-transform" alt="" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{book.title}</p>
                            <p className="text-xs text-gray-500 truncate">{book.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600">
                          {book.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-primary font-bold">${book.price}</span>
                          {book.isBorrowable && <span className="text-emerald-600 font-bold">${book.borrowPrice}/d</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(book)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(book.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Hidden on Desktop) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredBooks.map((book) => (
                <div key={book.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
                  <div className="flex gap-4">
                    <img src={book.coverImage} className="h-20 w-16 object-cover rounded-lg shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900 truncate">{book.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                          {book.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{book.author}</p>
                      <div className="flex gap-3 text-xs font-bold">
                        <span className="text-primary">Buy: ${book.price}</span>
                        {book.isBorrowable && <span className="text-emerald-600">Borrow: ${book.borrowPrice}/d</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => startEdit(book)}
                      className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredBooks.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <p className="text-gray-500">No books found matching your search.</p>
              </div>
            )}
          </div>

          {/* Form Side Panel (Responsive Overlay/Sidebar) */}
          {(isAdding || editingBook) && (
            <div className="fixed inset-0 z-50 md:relative md:inset-auto bg-black/50 md:bg-transparent animate-in fade-in duration-200">
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-[500px] md:max-w-none md:relative bg-white md:bg-white p-6 shadow-2xl md:shadow-lg md:rounded-2xl border-l md:border border-gray-100 h-full md:h-fit sticky top-24 overflow-y-auto animate-in slide-in-from-right-10 md:slide-in-from-right-0">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{editingBook ? 'Edit Details' : 'Add New Book'}</h3>
                    <p className="text-xs text-gray-500">Complete the information below</p>
                  </div>
                  <button onClick={() => { setIsAdding(false); setEditingBook(null); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pb-20 md:pb-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Title</label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Author</label>
                      <input
                        required
                        type="text"
                        value={formData.author}
                        onChange={(e) => setFormData({...formData, author: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Buy Price</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Borrow Price/Day</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.borrowPrice}
                        onChange={(e) => setFormData({...formData, borrowPrice: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Cover Image URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.coverImage}
                          onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/10 outline-none"
                          placeholder="https://..."
                        />
                        <div className="h-11 w-11 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden shrink-0">
                          {formData.coverImage ? <img src={formData.coverImage} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="h-5 w-5 text-gray-300" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="borrowable"
                      checked={formData.isBorrowable}
                      onChange={(e) => setFormData({...formData, isBorrowable: e.target.checked})}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="borrowable" className="text-sm font-medium text-gray-700">Available for borrowing</label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200"
                  >
                    <Save className="h-5 w-5" />
                    {editingBook ? 'Update Library' : 'Add to Library'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
