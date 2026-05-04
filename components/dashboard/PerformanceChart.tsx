'use client';

import { Card } from '@/components/ui/card';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartPoint } from '@/lib/adapters/chart';

type Props = {
  chartData: ChartPoint[];
  forecastBoundaryLabel: string | null;
  modelLabel: string;
  asOfLabel: string;
};

export function PerformanceChart({
  chartData,
  forecastBoundaryLabel,
  modelLabel,
  asOfLabel,
}: Props) {
  return (
    <Card className="p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">Portfolio Performance &amp; Forecast</h2>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
          {modelLabel} · updated {asOfLabel}
        </p>
      </div>

      <div className="mt-6 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perfBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />

            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#perfBandFill)"
              isAnimationActive={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="var(--card)"
              isAnimationActive={false}
              connectNulls
            />

            <Line
              type="monotone"
              dataKey="historical"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--chart-1)' }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {forecastBoundaryLabel && (
              <ReferenceLine
                x={forecastBoundaryLabel}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 4"
                label={{
                  value: 'Forecast →',
                  position: 'insideTopRight',
                  fill: 'var(--muted-foreground)',
                  fontSize: 10,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  const hist = get('historical');
  const fc = get('forecast');
  const lo = get('lower');
  const hi = get('upper');
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{label}</div>
      {hist != null && (
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
          Historical
          <span className="ml-auto tabular-nums text-foreground">
            ${hist.toLocaleString()}
          </span>
        </div>
      )}
      {fc != null && hist == null && (
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />
          Forecast
          <span className="ml-auto tabular-nums text-foreground">
            ${fc.toLocaleString()}
          </span>
        </div>
      )}
      {lo != null && hi != null && hist == null && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          90% CI: ${lo.toLocaleString()} – ${hi.toLocaleString()}
        </div>
      )}
    </div>
  );
}
