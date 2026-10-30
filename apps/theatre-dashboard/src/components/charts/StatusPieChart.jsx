import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = {
  CONFIRMED: '#22C55E',
  PENDING_PAYMENT: '#F59E0B',
  CANCELLED: '#EF4444',
  EXPIRED: '#64748B'
};

export function StatusPieChart({ data = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-slate-500">
        No booking status data available.
      </div>
    );
  }

  // Format data: ensure name and count properties exist
  const formatted = data.map((item) => ({
    name: item._id || item.status || item.name || 'UNKNOWN',
    value: item.count || item.value || 0
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {formatted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] || '#38BDF8'}
                stroke="#070A10"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              borderColor: '#273147',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '12px'
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            formatter={(val) => <span className="text-slate-300">{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StatusPieChart;

