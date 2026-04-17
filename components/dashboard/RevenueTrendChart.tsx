'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { MonthlyPortfolioSummary } from '@/lib/analytics/types';

type Props = {
  data: Pick<
    MonthlyPortfolioSummary,
    'revenue_month' | 'total_revenue' | 'portfolio_adr'
  >[];
};

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

function formatMonth(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM yy');
  } catch {
    return dateStr;
  }
}

export function RevenueTrendChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Revenue Trend
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="revenue_month"
            tickFormatter={formatMonth}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            formatter={(value, name) => [
              `$${Number(value).toLocaleString()}`,
              name === 'total_revenue' ? 'Revenue' : 'ADR',
            ]}
            labelFormatter={(label) => formatMonth(String(label))}
          />
          <Legend
            formatter={(value: string) =>
              value === 'total_revenue' ? 'Revenue' : 'ADR'
            }
          />
          <Bar
            yAxisId="left"
            dataKey="total_revenue"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="portfolio_adr"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f59e0b' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
