import React, { useEffect, useRef } from 'react';
import { CheckCircle, X, Printer } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500',  'bg-pink-500',    'bg-indigo-500',
];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Normalize raw API invoice into the shape this modal expects
function parseUTC(str) {
  if (!str) return new Date();
  return new Date(str.includes('Z') || str.includes('+') ? str : str + 'Z');
}

export function normalizeInvoice(raw) {
  const dt = parseUTC(raw.created_at);
  return {
    receiptNo:    raw.receipt_no,
    date:         dt.toLocaleDateString(),
    time:         dt.toLocaleTimeString(),
    cashierName:  raw.cashier_name  || '—',
    locationName: raw.location_name || '—',
    organization: raw.organization  || '',
    items: (raw.items || []).map(i => ({
      name:     i.product_name,
      quantity: i.quantity,
      price:    parseFloat(i.unit_price),
    })),
    total:       parseFloat(raw.total_amount),
    paymentType: raw.payment_type   || '—',
  };
}

export default function InvoiceModal({ invoice, onClose }) {
  const printRef = useRef();
  const totalQty = invoice.items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt ${invoice.receiptNo}</title>
      <style>
        @page { margin: 0; size: A4; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', system-ui, Arial, sans-serif;
          background: #f1f5f9;
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 48px 24px;
          color: #1e293b;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          background: #fff;
          width: 100%;
          max-width: 620px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,.12);
        }
        .header {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          padding: 36px 40px 28px;
        }
        .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-avatar {
          width: 52px; height: 52px;
          background: rgba(255,255,255,.2);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 800; color: #fff;
          border: 2px solid rgba(255,255,255,.3);
        }
        .brand-name { font-size: 20px; font-weight: 800; color: #fff; line-height: 1.2; }
        .brand-sub  { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 2px; }
        .header-badge {
          background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
          color: #fff; font-size: 11px; font-weight: 600;
          padding: 4px 12px; border-radius: 20px; letter-spacing: .03em;
        }
        .receipt-no    { font-size: 13px; color: rgba(255,255,255,.6); letter-spacing: .04em; }
        .receipt-title { font-size: 28px; font-weight: 800; color: #fff; margin-top: 2px; }
        .meta-section  { padding: 28px 40px; border-bottom: 1px solid #f1f5f9; }
        .meta-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .meta-card     { background: #f8fafc; border-radius: 12px; padding: 12px 16px; }
        .meta-label    { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; margin-bottom: 4px; }
        .meta-value    { font-size: 14px; font-weight: 700; color: #1e293b; }
        .items-section { padding: 28px 40px; border-bottom: 1px solid #f1f5f9; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        thead th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; padding: 0 0 10px; border-bottom: 2px solid #f1f5f9; }
        thead th:nth-child(2) { text-align: center; }
        thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
        tbody tr { border-bottom: 1px solid #f8fafc; }
        tbody tr:last-child { border-bottom: none; }
        tbody td { padding: 12px 0; font-size: 13px; color: #475569; vertical-align: middle; }
        tbody td:first-child { font-weight: 600; color: #1e293b; }
        tbody td:nth-child(2) { text-align: center; color: #94a3b8; font-size: 12px; }
        tbody td:nth-child(3) { text-align: right; }
        tbody td:nth-child(4) { text-align: right; font-weight: 700; color: #1e293b; }
        .totals-section { padding: 28px 40px; }
        .totals-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
        .totals-row:last-of-type { border-bottom: none; }
        .total-final { background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .total-final-label  { font-size: 13px; font-weight: 700; color: #1d4ed8; }
        .total-final-count  { font-size: 11px; color: #60a5fa; margin-top: 2px; }
        .total-final-amount { font-size: 32px; font-weight: 900; color: #1d4ed8; }
        .payment-chip { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; }
        .payment-chip::before { content: '✓'; font-weight: 800; }
        .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #f1f5f9; }
        .footer-thanks  { font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
        .footer-sub     { font-size: 11px; color: #94a3b8; }
        .footer-divider { border: none; border-top: 1px dashed #e2e8f0; margin: 16px auto; width: 60px; }
        @media print {
          body { background: #fff; padding: 0; }
          .page { box-shadow: none; border-radius: 0; max-width: 100%; }
        }
      </style>
    </head><body>
      <div class="page">
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-avatar">${invoice.locationName.slice(0,2).toUpperCase()}</div>
              <div>
                <div class="brand-name">${invoice.locationName}</div>
                <div class="brand-sub">${invoice.organization}</div>
              </div>
            </div>
            <span class="header-badge">✓ Paid</span>
          </div>
          <div class="receipt-no">RECEIPT</div>
          <div class="receipt-title">${invoice.receiptNo}</div>
        </div>
        <div class="meta-section">
          <div class="meta-grid">
            <div class="meta-card"><div class="meta-label">Date</div><div class="meta-value">${invoice.date}</div></div>
            <div class="meta-card"><div class="meta-label">Time</div><div class="meta-value">${invoice.time}</div></div>
            <div class="meta-card"><div class="meta-label">Cashier</div><div class="meta-value">${invoice.cashierName}</div></div>
            <div class="meta-card"><div class="meta-label">Location</div><div class="meta-value">${invoice.locationName}</div></div>
          </div>
        </div>
        <div class="items-section">
          <div class="section-title">Order Items</div>
          <table>
            <thead><tr><th style="text-align:left">Item</th><th>Unit Price</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              ${invoice.items.map(i => `
                <tr>
                  <td>${i.name}</td>
                  <td style="text-align:center">$${i.price.toFixed(2)}</td>
                  <td style="text-align:right">${i.quantity}</td>
                  <td>$${(i.price * i.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="totals-section">
          <div class="total-final">
            <div>
              <div class="total-final-label">Total Amount</div>
              <div class="total-final-count">${totalQty} item${totalQty !== 1 ? 's' : ''}</div>
            </div>
            <div class="total-final-amount">$${invoice.total.toFixed(2)}</div>
          </div>
          <div class="totals-row">
            <span>Payment Method</span>
            <span class="payment-chip">${invoice.paymentType}</span>
          </div>
          <div class="totals-row">
            <span>Payment Status</span>
            <span style="font-weight:600;color:#16a34a">Completed</span>
          </div>
        </div>
        <div class="footer">
          <div class="footer-thanks">Thank you for your purchase!</div>
          <hr class="footer-divider"/>
          <div class="footer-sub">${invoice.locationName} · ${invoice.date} · ${invoice.receiptNo}</div>
        </div>
      </div>
    </body></html>`);
    win.document.close();
    win.print();
    win.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Success banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle size={18} className="text-white"/>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Sale Complete!</p>
              <p className="text-emerald-100 text-xs">{invoice.receiptNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition"><X size={18}/></button>
        </div>

        {/* Scrollable receipt body */}
        <div className="overflow-y-auto flex-1" ref={printRef}>

          {/* Store header */}
          <div className="flex flex-col items-center pt-5 pb-4 px-6 border-b border-dashed border-gray-200">
            <div className={`w-12 h-12 rounded-2xl ${avatarColor(invoice.locationName)} flex items-center justify-center text-white font-bold text-lg mb-2`}>
              {invoice.locationName.slice(0, 2).toUpperCase()}
            </div>
            <p className="font-bold text-gray-900 text-base">{invoice.locationName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{invoice.organization}</p>
          </div>

          {/* Meta info */}
          <div className="px-5 py-3 grid grid-cols-2 gap-y-2 border-b border-dashed border-gray-200">
            {[
              ['Receipt #', invoice.receiptNo],
              ['Date',      invoice.date],
              ['Time',      invoice.time],
              ['Cashier',   invoice.cashierName],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Items */}
          <div className="px-5 py-3 border-b border-dashed border-gray-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Qty</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amt</span>
            </div>
            <div className="space-y-2">
              {invoice.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 text-center whitespace-nowrap">{item.quantity}×${item.price.toFixed(2)}</p>
                  <p className="text-xs font-semibold text-gray-700 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="px-5 py-4 space-y-2">
            <div className="bg-blue-50 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-500 font-medium">{totalQty} item{totalQty !== 1 ? 's' : ''}</p>
                <p className="text-sm font-bold text-blue-700">Total Amount</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">${invoice.total.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-400">Payment method</span>
              <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{invoice.paymentType}</span>
            </div>
            <p className="text-center text-xs text-gray-300 pt-1">— Thank you for your purchase! —</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium text-gray-600">
            Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition flex items-center justify-center gap-2">
            <Printer size={14}/> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
