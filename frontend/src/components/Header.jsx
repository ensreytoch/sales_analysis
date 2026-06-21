import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const LS_KEY = 'sundery_notif_seen_at';

function parseUTC(str) {
  // "2026-06-21 14:30:00" → "2026-06-21T14:30:00Z"
  if (!str) return new Date(NaN);
  const normalized = str.replace(' ', 'T');
  return new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - parseUTC(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationBell() {
  const [open,    setOpen]    = useState(false);
  const [alerts,  setAlerts]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const ref = useRef(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setAlerts(data);
      const seenAt = localStorage.getItem(LS_KEY);
      const count  = seenAt
        ? data.filter(a => parseUTC(a.sent_at) > new Date(seenAt)).length
        : data.length;
      setUnread(count);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) {
      localStorage.setItem(LS_KEY, new Date().toISOString());
      setUnread(0);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Stock Alerts</p>
            <span className="text-xs text-gray-400">{alerts.length} recent</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No alerts yet</p>
            ) : alerts.map(a => (
              <div key={a.id} className="px-4 py-3 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    a.type === 'out_of_stock' ? 'bg-red-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.type === 'out_of_stock'
                        ? 'Out of stock'
                        : `Low stock — ${a.qty_at_alert} unit${a.qty_at_alert !== 1 ? 's' : ''} remaining`}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(a.sent_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ onRefresh, loading }) {
  const { user } = useAuth();
  const isAdmin  = ['Admin', 'Viewer'].includes(user?.roleName);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Sales Analytics</h2>
        <p className="text-xs text-gray-400 mt-0.5">{today}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>

        {isAdmin && <NotificationBell />}

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-none">{user?.fullName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user?.roleName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
