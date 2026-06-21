import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, BarChart2 } from 'lucide-react';

const CARDS = [
  {
    key: 'totalSales',
    label: 'Total Revenue',
    icon: DollarSign,
    color: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    format: (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: 'totalCost',
    label: 'Total Cost',
    icon: BarChart2,
    color: 'bg-rose-500',
    light: 'bg-rose-50',
    text: 'text-rose-600',
    format: (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: 'totalProfit',
    label: 'Net Profit',
    icon: TrendingUp,
    color: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    format: (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'bg-violet-500',
    light: 'bg-violet-50',
    text: 'text-violet-600',
    format: (v) => Number(v || 0).toLocaleString(),
  },
];

export default function KPICards({ dashboard }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, icon: Icon, color, light, text, format }) => (
        <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className={`${light} p-3 rounded-xl`}>
            <Icon className={`${text} w-6 h-6`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-bold text-gray-800 mt-0.5 truncate">{format(dashboard[key])}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
