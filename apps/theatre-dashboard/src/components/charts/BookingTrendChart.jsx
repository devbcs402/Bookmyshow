import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function BookingTrendChart({ data = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-slate-500">
        No booking telemetry available.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
          />
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
          <Bar dataKey="confirmed" name="Confirmed Bookings" fill="#22C55E" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ticketsSold" name="Tickets Sold" fill="#38BDF8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BookingTrendChart;

