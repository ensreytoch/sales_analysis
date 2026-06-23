import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRt, FileText, Loader2 } from 'lucide-react';
import Sidebar  from '../components/Sidebar';
import Header   from '../components/Header';
import api from '../services/api';

const SOURCE_OPTS  = [{ value: '', label: 'All Sources' }, { value: 'pos', label: 'POS' }, { value: 'historical', label: 'Historical' }];
const PAYMENT_OPTS = [{ value: '', label: 'All Payments' }, { value: 'Cash', label: 'Cash' }, { value: 'Other Payment', label: 'Other Payment' }];
const LIMIT = 20;

function SourceBadge({ source }) {
  if (source === 'pos')
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">POS</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Historical</span>;
}

function StatusBadge({ status }) {
  const color = status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${color}`}>{status}</span>;
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(/Z|[+-]\d{2}:/.test(str) ? str : str + 'Z').toLocaleString();
}

export default function InvoicesPage() {
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [filters,   setFilters]   = useState({ from: '', to: '', payment_type: '', source: '' });

  // expand state
  const [expanded,   setExpanded]   = useState(new Set());  // set of invoice IDs
  const [itemCache,  setItemCache]  = useState({});          // { [id]: items[] }
  const [loadingRow, setLoadingRow] = useState(null);        // id being fetched

  const fetchInvoices = useCallback(async (p = page, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (f.from)         params.set('from',         f.from);
      if (f.to)           params.set('to',           f.to);
      if (f.payment_type) params.set('payment_type', f.payment_type);
      if (f.source)       params.set('source',       f.source);
      const { data } = await api.get(`/invoices?${params}`);
      setInvoices(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchInvoices(page, filters); }, [page]);

  const applyFilters = () => { setPage(1); fetchInvoices(1, filters); };
  const resetFilters = () => {
    const empty = { from: '', to: '', payment_type: '', source: '' };
    setFilters(empty);
    setPage(1);
    fetchInvoices(1, empty);
  };

  const toggleRow = async (id) => {
    if (expanded.has(id)) {
      setExpanded(prev => { const s = new Set(prev); s.delete(id); return s; });
      return;
    }
    setExpanded(prev => new Set(prev).add(id));
    if (itemCache[id]) return; // already fetched
    setLoadingRow(id);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setItemCache(prev => ({ ...prev, [id]: data.items || [] }));
    } catch (err) {
      console.error(err);
      setItemCache(prev => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingRow(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const COLS = 10; // expand + Receipt + Date + Cashier + Location + Items + Total + Payment + Source + Status

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Header loading={loading} onRefresh={() => fetchInvoices(page, filters)} />

        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">

          {/* Page header */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <FileText size={16} className="text-white"/>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Invoices</h1>
              <p className="text-xs text-gray-400">{total.toLocaleString()} total records</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">From</label>
              <input type="date" value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">To</label>
              <input type="date" value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Payment</label>
              <select value={filters.payment_type}
                onChange={e => setFilters(f => ({ ...f, payment_type: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                {PAYMENT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Source</label>
              <select value={filters.source}
                onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                {SOURCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button onClick={applyFilters}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              Apply
            </button>
            <button onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Reset
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                  <tr>
                    <th className="px-2 py-3 w-8"/>
                    {['Receipt #', 'Date & Time', 'Cashier', 'Location', 'Items', 'Total', 'Payment', 'Source', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={COLS} className="py-16 text-center">
                      <Loader2 size={24} className="animate-spin text-blue-500 mx-auto"/>
                    </td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={COLS} className="py-16 text-center text-gray-400 text-sm">No invoices found</td></tr>
                  ) : invoices.map(inv => {
                    const isOpen = expanded.has(inv.id);
                    const items  = itemCache[inv.id];
                    const fetching = loadingRow === inv.id;
                    return (
                      <React.Fragment key={inv.id}>
                        <tr className="border-b border-gray-50 hover:bg-blue-50/30 transition">
                          {/* Expand toggle */}
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={() => toggleRow(inv.id)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition"
                            >
                              {fetching
                                ? <Loader2 size={14} className="animate-spin"/>
                                : isOpen
                                  ? <ChevronDown size={14}/>
                                  : <ChevronRt size={14}/>}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{inv.receipt_no}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(inv.created_at)}</td>
                          <td className="px-4 py-3 text-gray-700">{inv.cashier_name || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{inv.location_name}</td>
                          <td className="px-4 py-3 text-center text-gray-500 text-xs">{inv.item_count}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800 text-right whitespace-nowrap">${Number(inv.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{inv.payment_type || '—'}</td>
                          <td className="px-4 py-3"><SourceBadge source={inv.source}/></td>
                          <td className="px-4 py-3"><StatusBadge status={inv.payment_status}/></td>
                        </tr>

                        {/* Expanded items sub-row */}
                        {isOpen && (
                          <tr className="bg-blue-50/20 border-b border-blue-100">
                            <td/>
                            <td colSpan={COLS - 1} className="px-6 py-3">
                              {!items ? (
                                <p className="text-xs text-gray-400 py-2">Loading items…</p>
                              ) : items.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">No items found.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400 uppercase tracking-wide">
                                      <th className="text-left pb-1.5 font-semibold">Product</th>
                                      <th className="text-center pb-1.5 font-semibold w-16">Qty</th>
                                      <th className="text-right pb-1.5 font-semibold w-24">Unit Price</th>
                                      <th className="text-right pb-1.5 font-semibold w-24">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-blue-100">
                                    {items.map((item, i) => (
                                      <tr key={i}>
                                        <td className="py-1.5 text-gray-700 font-medium">{item.product_name}</td>
                                        <td className="py-1.5 text-center text-gray-500">{item.quantity}</td>
                                        <td className="py-1.5 text-right text-gray-600">${Number(item.unit_price).toFixed(2)}</td>
                                        <td className="py-1.5 text-right font-semibold text-gray-800">${Number(item.subtotal).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-400">
                Showing {invoices.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft size={14}/>
                </button>
                <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
