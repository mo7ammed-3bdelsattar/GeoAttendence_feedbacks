import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useCartStore } from '../../stores/cartStore.ts';
import { useHistoryStore } from '../../stores/historyStore.ts';
import { useTransactionStore } from '../../stores/transactionStore.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Calendar, ShieldCheck, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function StudentCartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, updateDuration, clearCart, totalPrice } = useCartStore();
  const addHistoryItems = useHistoryStore((s) => s.addItems);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const user = useAuthStore((s) => s.user);
  const [isVerifying, setIsVerifying] = useState(false);
  const [collegeCode, setCollegeCode] = useState('');
  const total = totalPrice();

  const handleCheckout = () => {
    if (!collegeCode.trim()) {
      toast.error('Please enter your College Code to confirm.');
      return;
    }

    const promise = new Promise((resolve) => setTimeout(resolve, 2000));
    toast.promise(promise, {
      loading: 'Verifying code and processing transaction...',
      success: 'Transaction successful! Your items are ready.',
      error: 'Transaction failed. Please try again.',
    });
    
    promise.then(() => {
      const checkoutItems = [...items];
      addHistoryItems(checkoutItems);
      if (user) {
        addTransaction(checkoutItems, { id: user.id, name: user.name }, collegeCode);
        toast.success(`Transaction logged for ${user.name}`);
      }
      clearCart();
      navigate('/student/bookstore');
    });
  };

  return (
    <AppShell title="My Cart">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header & Back Button */}
        <div className="flex items-center justify-between">
          <Link
            to="/student/bookstore"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white border border-gray-100 group-hover:border-primary/20 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Continue Shopping</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 1 of 2</span>
            <div className="flex gap-1">
              <div className="h-1.5 w-8 rounded-full bg-primary" />
              <div className={cn("h-1.5 w-8 rounded-full transition-all", isVerifying ? "bg-primary" : "bg-gray-100")} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* Cart Items List */}
          <div className="space-y-4">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={`${item.id}-${item.action}`} className="bg-white rounded-3xl border border-gray-100 p-4 md:p-5 flex gap-4 md:gap-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                  {/* Action Ribbon */}
                  <div className={cn(
                    "absolute top-0 right-0 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm",
                    item.action === 'borrow' ? "bg-emerald-500" : "bg-primary"
                  )}>
                    {item.action}
                  </div>

                  <div className="h-28 w-20 md:h-32 md:w-24 shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                    <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-base md:text-lg truncate mb-0.5">{item.title}</h3>
                      <p className="text-sm text-gray-500 font-medium">{item.author}</p>
                    </div>

                    <div className="space-y-4">
                      {item.action === 'borrow' && (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                            <select
                              value={item.duration}
                              onChange={(e) => updateDuration(item.id, parseInt(e.target.value))}
                              className="text-xs font-bold text-emerald-700 bg-transparent outline-none cursor-pointer"
                            >
                              {[...Array(10)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1} {i === 0 ? 'Day' : 'Days'}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Limit: 10D</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.action, item.quantity - 1)}
                            className="h-8 w-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 disabled:opacity-30 active:scale-90 transition-all"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.action, item.quantity + 1)}
                            className="h-8 w-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 active:scale-90 transition-all"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Subtotal</p>
                          <span className={cn(
                            "text-lg font-black",
                            item.action === 'borrow' ? "text-emerald-600" : "text-primary"
                          )}>
                            ${((item.action === 'buy' ? item.price : (item.borrowPrice ?? 0) * (item.duration ?? 1)) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id, item.action)}
                    className="absolute bottom-4 right-4 md:static p-2.5 h-fit text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                    title="Remove item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-[40px] border border-gray-100 p-12 text-center shadow-sm">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gray-50 mb-6 animate-pulse">
                  <ShoppingBag className="h-10 w-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-8 max-w-[250px] mx-auto text-sm">Looks like you haven't added any books to your bag yet.</p>
                <Link
                  to="/student/bookstore"
                  className="inline-flex items-center px-8 py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
                >
                  Explore Bookstore
                </Link>
              </div>
            )}
          </div>

          {/* Checkout Section */}
          {items.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-[40px] border border-gray-100 p-6 md:p-8 shadow-2xl shadow-gray-200/50 sticky top-24 space-y-8">
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-6">Order Details</h2>
                  <div className="space-y-4 mb-6 pb-6 border-b border-gray-50">
                    <div className="flex justify-between text-sm font-semibold text-gray-500">
                      <span>Items ({items.reduce((acc, i) => acc + i.quantity, 0)})</span>
                      <span className="text-gray-900">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-gray-500">
                      <span>Tax (VAT 0%)</span>
                      <span className="text-gray-900">$0.00</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-gray-500">
                      <span>Service Fee</span>
                      <span className="text-emerald-500 font-bold">FREE</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-3xl font-black text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                {!isVerifying ? (
                  <button
                    onClick={() => setIsVerifying(true)}
                    className="w-full py-4 rounded-[22px] bg-primary text-white font-black hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    Checkout Now
                  </button>
                ) : (
                  <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 space-y-5 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-black text-gray-900">Security Check</h3>
                      </div>
                      <button onClick={() => setIsVerifying(false)} className="text-gray-400 hover:text-gray-600 p-1">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">Please authenticate this transaction using your unique <span className="font-bold text-gray-900">College Code</span>.</p>
                      <input
                        type="text"
                        placeholder="Enter Code..."
                        value={collegeCode}
                        onChange={(e) => setCollegeCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-primary bg-white outline-none transition-all text-sm font-black tracking-widest text-center uppercase"
                      />
                      <button
                        onClick={handleCheckout}
                        className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200"
                      >
                        Confirm & Pay
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest justify-center">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span>Secure Checkout</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all items from your cart?')) {
                        clearCart();
                        setIsVerifying(false);
                      }
                    }}
                    className="w-full py-2 text-xs font-bold text-gray-300 hover:text-red-400 transition-colors"
                  >
                    Empty Bag
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// Need to import cn
import { cn } from '../../utils/cn.ts';
