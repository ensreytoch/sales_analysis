import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header  from '../components/Header';
import api     from '../services/api';

const PAYMENT_TYPES = ['', 'Cash', 'Other Payment'];

function PaymentBadge({ type }) {
  if (!type) return <span className="text-gray-300 text-xs">—</span>;
  const styles = type === 'Cash'
    ? 'bg-blue-50 text-blue-700'
    : 'bg-emerald-50 text-emerald-700';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>{type}</span>;
}

export default function TransactionsPage() {
  const [data,    setData]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [payment, setPayment] = useState('');
  const LIMIT = 15;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (from)    params.set('from',         from);
    if (to)      params.set('to',           to);
    if (payment) params.set('payment_type', payment);

    api.get(`/transactions?${params}`)
      .then(res => { setData(res.data.data); setTotal(res.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, from, to, payment]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  const applyFilter = () => { setPage(1); load(); };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment</label>
              <select value={payment} onChange={e => setPayment(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">All types</option>
                {PAYMENT_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={applyFilter}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              <Filter size={13}/> Apply
            </button>
            {(from || to || payment) && (
              <button onClick={() => { setFrom(''); setTo(''); setPayment(''); setPage(1); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition">
                Clear
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">{total.toLocaleString()} records</span>
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">No transactions found</td></tr>
                  ) : data.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{row.order_number || `#${row.id}`}</td>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{row.product_name}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{row.category}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{row.location_name}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{row.region_name}</td>
                      <td className="px-4 py-2.5"><PaymentBadge type={row.payment_type} /></td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-800">${Number(row.order_amount).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(/Z|[+-]\d{2}:/.test(row.creation_time) ? row.creation_time : row.creation_time + 'Z').toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft size={14}/>
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
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
