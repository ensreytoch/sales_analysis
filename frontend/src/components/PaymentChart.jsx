import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS  = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const LABELS  = ['Cash', 'Other Payment', 'Card', 'Digital'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">{payload[0].name}</p>
      <p className="text-sm font-semibold" style={{ color: payload[0].payload.fill }}>
        ${Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
};

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function PaymentChart({ data = [] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Payment Distribution</h3>
        <p className="text-xs text-gray-400 mt-0.5">Breakdown by payment method</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="sales"
            nameKey="type"
            cx="50%"
            cy="43%"
            outerRadius={75}
            labelLine={false}
            label={renderLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
