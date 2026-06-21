import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, PackagePlus, Package, X, AlertTriangle, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header  from '../components/Header';
import api from '../services/api';

const AVATAR_COLORS = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-rose-500',
  'bg-amber-500','bg-cyan-500','bg-pink-500','bg-indigo-500',
];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function StockBadge({ qty }) {
  if (qty <= 0)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">Out of stock</span>;
  if (qty < 10)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600">{qty} low</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">{qty} in stock</span>;
}

const EMPTY_FORM = { config_id: '', purchase_price: '', initial_stock: '0' };

function ProductModal({ form, setForm, allConfigs, onSave, onClose, isEdit, editTarget, saving, error }) {
  const selectedConfig = allConfigs.find(c => String(c.id) === String(form.config_id));

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold">{isEdit ? 'Set Price Override' : 'Add to Inventory'}</p>
            <p className="text-blue-100 text-xs">{isEdit ? 'Override the catalog price for this product' : 'Select a product from the catalog'}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          {isEdit ? (
            /* Edit — show config read-only, only price is editable */
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              {editTarget?.image_url
                ? <img src={editTarget.image_url} alt={editTarget.name} className="w-10 h-10 rounded-xl object-cover shrink-0"/>
                : <div className={`w-10 h-10 rounded-xl ${avatarColor(editTarget?.name || '')} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {(editTarget?.name || '').slice(0,2).toUpperCase()}
                  </div>
              }
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{editTarget?.name}</p>
                <p className="text-xs text-gray-400">{editTarget?.category} · Catalog: ${Number(editTarget?.standard_price).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            /* Add — select from catalog */
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Select from Catalog</label>
              <select value={form.config_id} onChange={e => setForm(f => ({ ...f, config_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                <option value="">Choose a product…</option>
                {allConfigs.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.category} (${Number(c.standard_price).toFixed(2)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Preview card when config selected on Add */}
          {!isEdit && selectedConfig && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              {selectedConfig.image_url
                ? <img src={selectedConfig.image_url} alt={selectedConfig.name} className="w-10 h-10 rounded-xl object-cover shrink-0"/>
                : <div className={`w-10 h-10 rounded-xl ${avatarColor(selectedConfig.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {selectedConfig.name.slice(0,2).toUpperCase()}
                  </div>
              }
              <div>
                <p className="font-semibold text-gray-800 text-sm">{selectedConfig.name}</p>
                <p className="text-xs text-gray-500">{selectedConfig.category} · ${Number(selectedConfig.standard_price).toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">
              Price Override ($) <span className="text-gray-300">— leave blank to use catalog price</span>
            </label>
            <input type="number" min="0" step="0.01" value={form.purchase_price}
              onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
              placeholder={selectedConfig ? `Catalog: $${Number(selectedConfig.standard_price).toFixed(2)}` : isEdit ? `Catalog: $${Number(editTarget?.standard_price).toFixed(2)}` : '0.00'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Initial Stock</label>
              <input type="number" min="0" value={form.initial_stock}
                onChange={e => setForm(f => ({ ...f, initial_stock: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium text-gray-600">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? 'Saving…' : isEdit ? 'Save Override' : 'Add to Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestockModal({ product, onSave, onClose, saving, error }) {
  const [qty,   setQty]   = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold">Restock Product</p>
            <p className="text-emerald-100 text-xs truncate max-w-[200px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <span className="text-xs text-gray-500">Current stock</span>
            <StockBadge qty={product.stock_qty}/>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Quantity to Add</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="e.g. 50"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"/>
          </div>

          {qty > 0 && (
            <div className="text-xs text-gray-400 bg-emerald-50 rounded-xl px-3 py-2">
              New stock after restock: <strong className="text-emerald-700">{parseInt(product.stock_qty) + parseInt(qty || 0)}</strong>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Notes <span className="text-gray-300">(optional)</span></label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Weekly restock"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"/>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium text-gray-600">
            Cancel
          </button>
          <button onClick={() => onSave(qty, notes)} disabled={saving || !qty || parseInt(qty) <= 0}
            className="flex-1 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 disabled:opacity-50 transition">
            {saving ? 'Adding…' : 'Add Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MovementsModal({ product, movements, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const typeStyle = {
    initial:    'bg-blue-50 text-blue-600',
    restock:    'bg-emerald-50 text-emerald-600',
    sale:       'bg-rose-50 text-rose-600',
    adjustment: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-white font-bold">Stock History</p>
            <p className="text-gray-300 text-xs truncate max-w-[240px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18}/></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {movements.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No movements yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {movements.map(m => (
                <div key={m.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${typeStyle[m.type] || 'bg-gray-100 text-gray-500'}`}>
                    {m.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{m.notes || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.created_by_name || 'System'} · {new Date(/Z|[+-]\d{2}:/.test(m.created_at) ? m.created_at : m.created_at + 'Z').toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LIMIT = 20;

export default function ProductsPage() {
  const { user } = useAuth();
  const canWrite = user?.permissions?.includes('products:write');

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [allConfigs,  setAllConfigs]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [outOfStock,  setOutOfStock]  = useState(0);
  const [lowStock,    setLowStock]    = useState(0);

  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('');
  const searchTimer = useRef(null);

  const [modal,       setModal]       = useState(null);
  const [target,      setTarget]      = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [movements,   setMovements]   = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [modalError,  setModalError]  = useState('');

  const fetchProducts = useCallback(async (p = page, s = search, cat = filterCat) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (s)   params.set('search',      s);
      if (cat) params.set('category_id', cat);

      const requests = [api.get(`/products?${params}`)];
      if (!categories.length) requests.push(api.get('/products/categories'));

      const [pRes, cRes] = await Promise.all(requests);
      setProducts(pRes.data.data);
      setTotal(pRes.data.total);
      setOutOfStock(pRes.data.outOfStock);
      setLowStock(pRes.data.lowStock);
      if (cRes) setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat, categories.length]);

  const fetchAllConfigs = useCallback(async () => {
    try {
      const { data } = await api.get('/product-configs/all');
      setAllConfigs(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchProducts(1, search, filterCat); fetchAllConfigs(); }, []);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchProducts(1, val, filterCat);
    }, 350);
  };

  const handleCatChange = (val) => {
    setFilterCat(val);
    setPage(1);
    fetchProducts(1, search, val);
  };

  const goToPage = (p) => {
    setPage(p);
    fetchProducts(p, search, filterCat);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const openAdd = () => {
    if (!allConfigs.length) fetchAllConfigs();
    setForm(EMPTY_FORM);
    setModalError('');
    setModal('add');
  };
  const openEdit = (p) => {
    setTarget(p);
    setForm({ config_id: String(p.config_id), purchase_price: p.price_overridden ? String(p.purchase_price) : '', initial_stock: '0' });
    setModalError('');
    setModal('edit');
  };
  const openRestock = (p) => { setTarget(p); setModalError(''); setModal('restock'); };
  const openMovements = async (p) => {
    setTarget(p);
    setModal('movements');
    setMovements([]);
    const { data } = await api.get(`/products/${p.id}/movements`);
    setMovements(data);
  };

  const handleSave = async () => {
    setModalError('');
    if (modal === 'add' && !form.config_id)
      return setModalError('Please select a product from the catalog.');
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/products', {
          config_id:      parseInt(form.config_id),
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
          initial_stock:  parseInt(form.initial_stock),
        });
      } else {
        await api.put(`/products/${target.id}`, {
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        });
      }
      setModal(null);
      fetchProducts(page, search, filterCat);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestock = async (qty, notes) => {
    setModalError('');
    setSaving(true);
    try {
      await api.post(`/products/${target.id}/restock`, { quantity: parseInt(qty), notes });
      setModal(null);
      fetchProducts(page, search, filterCat);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to restock.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      const newPage = products.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      fetchProducts(newPage, search, filterCat);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete product.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Header loading={loading} onRefresh={() => fetchProducts(page, search, filterCat)}/>

        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">

          {/* Page header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Package size={16} className="text-white"/>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Products</h1>
                <p className="text-xs text-gray-400">{total.toLocaleString()} products</p>
              </div>
            </div>
            {canWrite && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200">
                <Plus size={15}/> Add Product
              </button>
            )}
          </div>

          {/* Stock alerts */}
          {(outOfStock > 0 || lowStock > 0) && (
            <div className="flex gap-3 shrink-0">
              {outOfStock > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                  <AlertTriangle size={14} className="text-red-500"/>
                  <span className="text-xs font-semibold text-red-600">{outOfStock} out of stock</span>
                </div>
              )}
              {lowStock > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
                  <AlertTriangle size={14} className="text-amber-500"/>
                  <span className="text-xs font-semibold text-amber-600">{lowStock} low stock</span>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 shrink-0">
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/>
            <select value={filterCat} onChange={e => handleCatChange(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                  <tr>
                    {['Product', 'Category', 'Unit Price', 'Stock', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={5} className="py-16 text-center text-gray-300 text-sm">Loading…</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={5} className="py-16 text-center text-gray-400 text-sm">No products found</td></tr>
                  ) : products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-xl object-cover shrink-0"/>
                            : <div className={`w-9 h-9 rounded-xl ${avatarColor(p.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{p.name.slice(0,2).toUpperCase()}</div>
                          }
                          <span className="font-medium text-gray-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.category}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">${Number(p.purchase_price).toFixed(2)}</td>
                      <td className="px-4 py-3"><StockBadge qty={p.stock_qty}/></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openMovements(p)} title="Stock history"
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                            <History size={14}/>
                          </button>
                          {canWrite && (<>
                            <button onClick={() => openRestock(p)} title="Restock"
                              className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition">
                              <PackagePlus size={14}/>
                            </button>
                            <button onClick={() => openEdit(p)} title="Edit"
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <Pencil size={14}/>
                            </button>
                            <button onClick={() => handleDelete(p)} title="Delete"
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={14}/>
                            </button>
                          </>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-400">
                Showing {products.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft size={14}/>
                </button>
                <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
                <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <ProductModal form={form} setForm={setForm} allConfigs={allConfigs}
          onSave={handleSave} onClose={() => setModal(null)}
          isEdit={modal === 'edit'} editTarget={target}
          saving={saving} error={modalError}/>
      )}
      {modal === 'restock' && target && (
        <RestockModal product={target} onSave={handleRestock} onClose={() => setModal(null)}
          saving={saving} error={modalError}/>
      )}
      {modal === 'movements' && target && (
        <MovementsModal product={target} movements={movements} onClose={() => setModal(null)}/>
      )}
    </div>
  );
}
