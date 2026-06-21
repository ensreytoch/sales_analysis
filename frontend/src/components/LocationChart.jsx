import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-emerald-600">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

export default function LocationChart({ data = [] }) {
  const max = Math.max(...data.map(d => d.sales), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Sales by Region</h3>
        <p className="text-xs text-gray-400 mt-0.5">Top performing locations</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis dataKey="region" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={75} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0fdf4' }} />
          <Bar dataKey="sales" radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((entry, i) => (
              <Cell key={i} fill={`rgba(16,185,129,${0.4 + 0.6 * (entry.sales / max)})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
