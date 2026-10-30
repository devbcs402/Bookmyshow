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
  CONFIRMED: '#10B981',
  PENDING_PAYMENT: '#F59E0B',
  CANCELLED: '#EF4444',
  EXPIRED: '#94A3B8'
};

export function StatusDonutChart({ data = [], height = 260 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-slate-400">
        No status telemetry available.
      </div>
    );
  }

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
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {formatted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name] || '#3B82F6'}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderRadius: '8px',
              color: '#0F172A',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            formatter={(val) => <span className="text-slate-600">{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StatusDonutChart;

