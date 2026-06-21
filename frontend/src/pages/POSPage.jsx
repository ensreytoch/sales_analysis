import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, MapPin, CheckCircle, Search, X } from 'lucide-react';
import InvoiceModal from '../components/InvoiceModal';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header  from '../components/Header';
import api     from '../services/api';

const PAYMENT_TYPES = ['Cash', 'Other Payment'];

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500',  'bg-pink-500',    'bg-indigo-500',
];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ProductAvatar({ name, image_url, size = 'md' }) {
  const dim   = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  const chars = name.trim().slice(0, 2).toUpperCase();
  if (image_url) {
    return <img src={image_url} alt={name} className={`${dim} rounded-xl object-cover shrink-0`} />;
  }
  return (
    <div className={`${dim} ${avatarColor(name)} rounded-xl flex items-center justify-center text-white font-bold shrink-0`}>
      {chars}
    </div>
  );
}

function ConfirmModal({ cart, total, paymentType, setPaymentType, location, onConfirm, onClose, submitting }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Review Order</h2>
              <p className="text-blue-100 text-xs mt-0.5">{location?.name} · {totalQty} item{totalQty !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="px-5 py-4 max-h-52 overflow-y-auto space-y-2">
          {cart.map(item => (
            <div key={item.product_id} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg ${avatarColor(item.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {item.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.quantity} × ${item.price.toFixed(2)}</p>
              </div>
              <span className="text-sm font-semibold text-gray-700 shrink-0">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Payment method selector */}
        <div className="px-5 pb-1 space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Payment method</p>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {PAYMENT_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setPaymentType(t)}
                className={`flex-1 text-xs py-2 rounded-lg font-semibold transition ${
                  paymentType === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mx-5 mt-3 rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2 mb-4">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Location</span>
            <div className="text-right">
              <span className="font-medium text-gray-700">{location?.name}</span>
              {location?.organization && (
                <p className="text-gray-400">{location.organization}</p>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-blue-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium text-gray-600">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={submitting}
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shadow-blue-200">
            {submitting ? 'Processing…' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSPage() {
  const [location,    setLocation]    = useState(null);
  const [products,    setProducts]    = useState([]);
  const [cart,        setCart]        = useState([]);
  const [paymentType, setPaymentType] = useState('Cash');
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [invoice,      setInvoice]      = useState(null);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(true);
  const { user: me } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, prodRes] = await Promise.all([
        api.get('/pos/location'),
        api.get('/pos/products'),
      ]);
      setLocation(locRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load POS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Set first category as default tab
  useEffect(() => {
    if (products.length && !activeTab) {
      const first = [...new Set(products.map(p => p.category))].sort()[0];
      setActiveTab(first);
    }
  }, [products, activeTab]);

  const addToCart = (product) => {
    if (product.stock_qty <= 0) return;
    setInvoice(null);
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) return prev;
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: Number(product.price), image_url: product.image_url, stock_qty: product.stock_qty, quantity: 1 }];
    });
  };

  const updateQty = (product_id, delta) =>
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      const next = i.quantity + delta;
      if (next < 1) return i;
      if (next > i.stock_qty) return i;
      return { ...i, quantity: next };
    }));

  const removeItem = (product_id) => setCart(prev => prev.filter(i => i.product_id !== product_id));

  const total    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartQty  = cart.reduce((s, i) => s + i.quantity, 0);

  const handleSell = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/pos/sell', { items: cart, payment_type: paymentType });
      const now = new Date();
      setInvoice({
        receiptNo:    res.data.receiptNo,
        date:         now.toLocaleDateString(),
        time:         now.toLocaleTimeString(),
        cashierName:  me?.fullName || me?.email || 'Cashier',
        locationName: location?.name || '—',
        organization: location?.organization || '',
        items:        cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total,
        paymentType,
      });
      setShowConfirm(false);
      setCart([]);
      // Refresh stock counts without blocking the invoice modal
      api.get('/pos/products').then(r => setProducts(r.data)).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [...new Set(products.map(p => p.category))].sort();

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchTab = search ? true : p.category === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden min-h-0">

          {/* ── Left panel ── */}
          <div className="flex-1 flex flex-col min-h-0 p-4 pr-2">

            {/* Top bar: location + search */}
            <div className="flex items-center gap-3 mb-3">
              {location && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-xs shrink-0">
                  <MapPin size={12} className="text-blue-500" />
                  <span className="font-semibold text-gray-700">{location.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">{location.organization}</span>
                </div>
              )}
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); }}
                  placeholder="Search products…"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category tabs */}
            {!search && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                      activeTab === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-100 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Product grid */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
                    <Search size={32} strokeWidth={1} />
                    <p className="text-sm mt-2">No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
                    {filtered.map(p => {
                      const inCart    = cart.find(i => i.product_id === p.id);
                      const outOfStock = p.stock_qty <= 0;
                      const lowStock   = !outOfStock && p.stock_qty <= 10;
                      return (
                        <button
                          key={p.id}
                          onClick={() => addToCart(p)}
                          disabled={outOfStock}
                          className={`relative bg-white rounded-2xl p-4 text-left border transition group ${
                            outOfStock
                              ? 'border-gray-100 opacity-50 cursor-not-allowed'
                              : inCart
                                ? 'border-blue-300 ring-1 ring-blue-200 hover:shadow-md'
                                : 'border-gray-100 hover:border-blue-200 hover:shadow-md'
                          }`}
                        >
                          {inCart && !outOfStock && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {inCart.quantity}
                            </span>
                          )}
                          <ProductAvatar name={p.name} image_url={p.image_url} />
                          <p className="text-sm font-semibold text-gray-800 mt-3 leading-tight line-clamp-2">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>
                          <div className="flex items-end justify-between mt-2">
                            <p className="text-base font-bold text-blue-600">${Number(p.price).toFixed(2)}</p>
                            <p className={`text-xs font-medium ${
                              outOfStock ? 'text-red-400' : lowStock ? 'text-amber-500' : 'text-gray-400'
                            }`}>
                              {outOfStock ? 'Out of stock' : `${p.stock_qty} left`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right panel: Cart ── */}
          <div className="w-80 flex flex-col bg-white border-l border-gray-100 shadow-sm">

            {/* Cart header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShoppingCart size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800 flex-1">Cart</h3>
              {cartQty > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">{cartQty} item{cartQty !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-200 select-none">
                  <ShoppingCart size={48} strokeWidth={1} />
                  <p className="text-sm mt-3 text-gray-300">Cart is empty</p>
                  <p className="text-xs text-gray-200 mt-1">Tap a product to add</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <ProductAvatar name={item.name} image_url={item.image_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <button onClick={() => removeItem(item.product_id)} className="text-gray-300 hover:text-rose-400 transition">
                        <Trash2 size={11} />
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.product_id, -1)}
                          className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition">
                          <Minus size={9} />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product_id, 1)}
                          disabled={item.quantity >= item.stock_qty}
                          className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
                          <Plus size={9} />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-gray-700">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            <div className="border-t border-gray-100 p-4 space-y-3">

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
              )}

              {/* Total */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
              </div>

              {/* Confirm */}
              <button
                onClick={() => { setError(''); setShowConfirm(true); }}
                disabled={!cart.length}
                className="w-full py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {`Confirm Sale · $${total.toFixed(2)}`}
              </button>
            </div>
          </div>

        </main>
      </div>

      {showConfirm && (
        <ConfirmModal
          cart={cart}
          total={total}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          location={location}
          onConfirm={handleSell}
          onClose={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}

      {invoice && (
        <InvoiceModal
          invoice={invoice}
          onClose={() => setInvoice(null)}
        />
      )}

    </div>
  );
}
