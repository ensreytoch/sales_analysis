import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-violet-600">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

const VIOLET_SHADES = ['#7c3aed','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'];

export default function ProductChart({ data = [] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Sales by Category</h3>
        <p className="text-xs text-gray-400 mt-0.5">Revenue per product category</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f3ff' }} />
          <Bar dataKey="sales" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={VIOLET_SHADES[i % VIOLET_SHADES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
