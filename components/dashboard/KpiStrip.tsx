import { BadgeDollarSign, CalendarDays, Moon, PieChart, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { KpiData } from '@/lib/adapters/kpis';
import type { ChartPoint } from '@/lib/adapters/chart';

type Props = {
  kpis: KpiData;
  chartData: ChartPoint[];
};

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function deltaBadge(deltaPct: number | null) {
  if (deltaPct == null) return null;
  const positive = deltaPct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <Badge variant={positive ? 'default' : 'destructive'} className="gap-1 font-medium">
      <Icon className="h-3 w-3" />
      {positive ? '+' : ''}
      {deltaPct.toFixed(1)}% M/M
    </Badge>
  );
}

function deltaInline(deltaPct: number | null) {
  if (deltaPct == null) return <span className="text-muted-foreground">no prior month</span>;
  const positive = deltaPct >= 0;
  return (
    <span className={positive ? 'text-emerald-600' : 'text-destructive'}>
      {positive ? '+' : ''}
      {deltaPct.toFixed(1)}% M/M
    </span>
  );
}

export function KpiStrip({ kpis, chartData }: Props) {
  const sparkSeries = chartData
    .filter((d) => d.historical != null)
    .map((d) => ({ v: d.historical as number }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="p-6 lg:col-span-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Portfolio Performance
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div className="text-5xl font-semibold tabular-nums tracking-tight">
            {fmtCurrency(kpis.revenue.value)}
          </div>
          {deltaBadge(kpis.revenue.deltaPct)}
        </div>

        <div className="mt-4 -mx-2 h-12">
          {sparkSeries.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkSeries} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--chart-1)"
                  strokeWidth={1.75}
                  fill="url(#kpiSparkFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        <KpiTile
          label="Active Properties"
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          value={kpis.propertyCount.toLocaleString()}
          sub="this month"
        />
        <KpiTile
          label="Nights Sold"
          icon={<Moon className="h-3.5 w-3.5" />}
          value={kpis.nights.value.toLocaleString()}
          sub={deltaInline(kpis.nights.deltaPct)}
        />
        <KpiTile
          label="Portfolio ADR"
          icon={<BadgeDollarSign className="h-3.5 w-3.5" />}
          value={fmtCurrency(kpis.adr.value)}
          sub={deltaInline(kpis.adr.deltaPct)}
        />
        <KpiTile
          label="Revenue M/M"
          icon={<PieChart className="h-3.5 w-3.5" />}
          value={kpis.revenue.deltaPct != null ? fmtPercent(kpis.revenue.deltaPct) : '—'}
          sub="vs. prior month"
        />
      </div>
    </div>
  );
}

function KpiTile({
  label,
  icon,
  value,
  sub,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  sub: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
    </Card>
  );
}
