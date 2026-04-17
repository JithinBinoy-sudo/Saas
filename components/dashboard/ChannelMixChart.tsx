'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChannelMixRow } from '@/lib/analytics/types';

type Props = {
  data: ChannelMixRow[];
};

const COLORS = [
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#10b981', // emerald
];

export function ChannelMixChart({ data }: Props) {
  const chartData = useMemo(() => {
    if (data.length <= 8) return data;

    const top7 = data.slice(0, 7);
    const rest = data.slice(7);
    const other: ChannelMixRow = {
      channel_label: 'Other',
      total_nights: rest.reduce((s, r) => s + r.total_nights, 0),
      total_revenue: rest.reduce((s, r) => s + r.total_revenue, 0),
      revenue_share: rest.reduce((s, r) => s + r.revenue_share, 0),
    };
    return [...top7, other];
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Channel Mix
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="total_revenue"
            nameKey="channel_label"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ channel_label, revenue_share }) =>
              `${channel_label} ${(revenue_share * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString()}`,
              name,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
