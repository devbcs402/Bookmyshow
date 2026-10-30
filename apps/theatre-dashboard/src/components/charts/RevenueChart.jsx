import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

export function RevenueChart({ data = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-slate-500">
        No revenue data recorded for selected period.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#273147" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748B"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#273147' }}
          />
          <YAxis
            stroke="#64748B"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              borderColor: '#273147',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '12px'
            }}
            formatter={(value) => [formatCurrency(value), 'Gross Sales']}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#0284C7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueChart;

