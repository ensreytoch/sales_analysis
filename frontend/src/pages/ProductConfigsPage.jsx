import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Tag, X, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
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

const EMPTY_FORM = { name: '', category_id: '', standard_price: '', image_url: '', description: '', is_active: true };
const LIMIT = 20;

function ConfigModal({ form, setForm, categories, onSave, onClose, isEdit, saving, error }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold">{isEdit ? 'Edit Catalog Item' : 'Add to Catalog'}</p>
            <p className="text-violet-100 text-xs">Define a standardized product entry</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Product Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Lychee Drink 250ml"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Category</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white">
                <option value="">Select</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Standard Price ($)</label>
              <input type="number" min="0" step="0.01" value={form.standard_price}
                onChange={e => setForm(f => ({ ...f, standard_price: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"/>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Image URL <span className="text-gray-300">(optional)</span></label>
            <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"/>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Description <span className="text-gray-300">(optional)</span></label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Short product description…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"/>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-400">Inactive items won't appear in inventory or POS</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                {form.is_active
                  ? <ToggleRight size={28} className="text-violet-600"/>
                  : <ToggleLeft  size={28} className="text-gray-300"/>
                }
              </button>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium text-gray-600">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-2xl hover:bg-violet-700 disabled:opacity-50 transition">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Catalog'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductConfigsPage() {
  const { user } = useAuth();
  const canWrite = user?.permissions?.includes('product-configs:write');

  const [configs,     setConfigs]    = useState([]);
  const [categories,  setCategories] = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [total,       setTotal]      = useState(0);
  const [page,        setPage]       = useState(1);

  const [search,      setSearch]     = useState('');
  const [filterCat,   setFilterCat]  = useState('');
  const searchTimer = useRef(null);

  const [modal,       setModal]      = useState(null);
  const [target,      setTarget]     = useState(null);
  const [form,        setForm]       = useState(EMPTY_FORM);
  const [saving,      setSaving]     = useState(false);
  const [modalError,  setModalError] = useState('');

  const fetchConfigs = useCallback(async (p = page, s = search, cat = filterCat) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (s)   params.set('search',      s);
      if (cat) params.set('category_id', cat);

      const [cfgRes, catRes] = await Promise.all([
        api.get(`/product-configs?${params}`),
        categories.length ? Promise.resolve({ data: categories }) : api.get('/product-configs/categories'),
      ]);
      setConfigs(cfgRes.data.data);
      setTotal(cfgRes.data.total);
      if (!categories.length) setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat, categories.length]);

  useEffect(() => { fetchConfigs(1, search, filterCat); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); fetchConfigs(1, val, filterCat); }, 350);
  };

  const handleCatChange = (val) => { setFilterCat(val); setPage(1); fetchConfigs(1, search, val); };
  const goToPage = (p) => { setPage(p); fetchConfigs(p, search, filterCat); };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const openAdd = () => { setForm(EMPTY_FORM); setModalError(''); setModal('add'); };
  const openEdit = (c) => {
    setTarget(c);
    setForm({
      name: c.name, category_id: String(c.category_id),
      standard_price: String(c.standard_price), image_url: c.image_url || '',
      description: c.description || '', is_active: c.is_active,
    });
    setModalError('');
    setModal('edit');
  };

  const handleSave = async () => {
    setModalError('');
    if (!form.name || !form.category_id || !form.standard_price)
      return setModalError('Name, category, and standard price are required.');
    setSaving(true);
    try {
      const payload = {
        name: form.name, category_id: parseInt(form.category_id),
        standard_price: parseFloat(form.standard_price),
        image_url: form.image_url || null, description: form.description || null,
        is_active: form.is_active,
      };
      if (modal === 'add') {
        await api.post('/product-configs', payload);
      } else {
        await api.put(`/product-configs/${target.id}`, payload);
      }
      setModal(null);
      fetchConfigs(page, search, filterCat);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Remove "${c.name}" from the catalog? This cannot be undone.`)) return;
    try {
      await api.delete(`/product-configs/${c.id}`);
      const newPage = configs.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      fetchConfigs(newPage, search, filterCat);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Header loading={loading} onRefresh={() => fetchConfigs(page, search, filterCat)}/>

        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">

          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
                <Tag size={16} className="text-white"/>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Product Catalog</h1>
                <p className="text-xs text-gray-400">{total.toLocaleString()} items</p>
              </div>
            </div>
            {canWrite && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition shadow-sm shadow-violet-200">
                <Plus size={15}/> Add to Catalog
              </button>
            )}
          </div>

          <div className="flex gap-3 shrink-0">
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search catalog…"
              className="flex-1 max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"/>
            <select value={filterCat} onChange={e => handleCatChange(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                  <tr>
                    {['Product', 'Category', 'Standard Price', 'In Inventory', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6} className="py-16 text-center text-gray-300 text-sm">Loading…</td></tr>
                  ) : configs.length === 0 ? (
                    <tr><td colSpan={6} className="py-16 text-center text-gray-400 text-sm">No catalog items found</td></tr>
                  ) : configs.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.image_url
                            ? <img src={c.image_url} alt={c.name} className="w-9 h-9 rounded-xl object-cover shrink-0"/>
                            : <div className={`w-9 h-9 rounded-xl ${avatarColor(c.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{c.name.slice(0,2).toUpperCase()}</div>
                          }
                          <div>
                            <p className="font-medium text-gray-800 leading-tight">{c.name}</p>
                            {c.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.category}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">${Number(c.standard_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {parseInt(c.product_count) > 0
                          ? <span className="text-xs text-emerald-600 font-semibold">Yes</span>
                          : <span className="text-xs text-gray-400">Not added</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Active</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">Inactive</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canWrite && (<>
                            <button onClick={() => openEdit(c)} title="Edit"
                              className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                              <Pencil size={14}/>
                            </button>
                            <button onClick={() => handleDelete(c)} title="Delete"
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

            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-400">
                Showing {configs.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
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
        <ConfigModal form={form} setForm={setForm} categories={categories}
          onSave={handleSave} onClose={() => setModal(null)}
          isEdit={modal === 'edit'} saving={saving} error={modalError}/>
      )}
    </div>
  );
}
