'use client';

import {
  Bed,
  Building2,
  Copy,
  FileText,
  Receipt,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ChartPoint } from '@/lib/adapters/chart';

export type BriefingDetailKpis = {
  properties: { value: string; progress: number };
  adr: { value: string; deltaLabel: string | null; deltaPositive: boolean };
  nights: { value: string; sub: string };
  revenue: { value: string; deltaLabel: string | null; deltaPositive: boolean };
};

export type BriefingForecast = {
  nextMonthRevenue: string;
  confidence: string;
  risk: string;
};

export type BriefingBreakdownRow = {
  id: string;
  revenue: string;
  vsMedian: string;
  vsMedianPositive: boolean;
  nights: number;
  adr: string;
  vsPrev: string;
  vsPrevPositive: boolean;
  status: 'healthy' | 'warning' | 'critical';
};

type Props = {
  generatedOnLabel: string;
  monthLabel: string;
  modelLabel: string;
  kpis: BriefingDetailKpis;
  summaryText: string | null;
  chartData: ChartPoint[];
  forecastBoundaryLabel: string | null;
  forecast: BriefingForecast;
  breakdown: BriefingBreakdownRow[];
  sparkUp: { v: number }[];
  sparkDown: { v: number }[];
  sparkBars: { v: number }[];
};

export function BriefingDetailView(props: Props) {
  const {
    generatedOnLabel,
    monthLabel,
    modelLabel,
    kpis,
    summaryText,
    chartData,
    forecastBoundaryLabel,
    forecast,
    breakdown,
    sparkUp,
    sparkDown,
    sparkBars,
  } = props;

  const [copied, setCopied] = useState(false);
  async function copySummary() {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Generated with {modelLabel}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Auto-Analysis</span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{monthLabel}</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {generatedOnLabel}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Properties"
          icon={<Building2 className="h-4 w-4" />}
          value={kpis.properties.value}
          visual={
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, kpis.properties.progress))}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {kpis.properties.progress.toFixed(0)}%
              </div>
            </div>
          }
        />
        <KpiCard
          label="ADR"
          icon={<Tag className="h-4 w-4" />}
          value={kpis.adr.value}
          visual={
            <div className="flex items-end justify-between gap-2">
              {kpis.adr.deltaLabel ? (
                <Badge
                  variant={kpis.adr.deltaPositive ? 'default' : 'destructive'}
                  className="gap-1 font-medium"
                >
                  {kpis.adr.deltaPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {kpis.adr.deltaLabel}
                </Badge>
              ) : (
                <span className="text-[11px] text-muted-foreground">no prior</span>
              )}
              <MiniSpark
                data={sparkDown}
                color={kpis.adr.deltaPositive ? 'var(--primary)' : 'var(--destructive)'}
                gradId="briefing-adr"
              />
            </div>
          }
        />
        <KpiCard
          label="Occupied Nights"
          icon={<Bed className="h-4 w-4" />}
          value={kpis.nights.value}
          visual={
            <div className="flex items-end justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">{kpis.nights.sub}</span>
              <MiniBars data={sparkBars} />
            </div>
          }
        />
        <KpiCard
          label="Total Revenue"
          icon={<Receipt className="h-4 w-4" />}
          value={kpis.revenue.value}
          visual={
            <div className="flex items-end justify-between gap-2">
              {kpis.revenue.deltaLabel ? (
                <Badge
                  variant={kpis.revenue.deltaPositive ? 'default' : 'destructive'}
                  className="gap-1 font-medium"
                >
                  {kpis.revenue.deltaPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {kpis.revenue.deltaLabel}
                </Badge>
              ) : (
                <span className="text-[11px] text-muted-foreground">no prior</span>
              )}
              <MiniSpark data={sparkUp} color="var(--primary)" gradId="briefing-rev" />
            </div>
          }
        />
      </div>

      {summaryText && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Executive Summary</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{generatedOnLabel}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={copySummary}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Button>
            </div>
          </div>
          <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {summaryText}
          </div>
        </Card>
      )}

      {chartData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Predictive Forecast</h2>
            <span className="ml-2 text-xs text-muted-foreground">
              90% confidence interval
            </span>
          </div>

          <div className="mt-5 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="briefingBand" x1="0" y1="0" x2="0" y2="1">
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
                <Tooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="url(#briefingBand)"
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
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ForecastTile label="Next-Month Revenue" value={forecast.nextMonthRevenue} />
            <ForecastTile label="Confidence" value={forecast.confidence} />
            <ForecastTile label="Risk Score" value={forecast.risk} />
          </div>
        </Card>
      )}

      {breakdown.length > 0 && (
        <Card className="p-6">
          <div>
            <h2 className="text-base font-semibold">Property Breakdown</h2>
            <p className="text-xs text-muted-foreground">
              Trailing 30 days performance metrics by unit.
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Property
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Revenue
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Vs Median
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Nights
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    ADR
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">
                    Vs Prev
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${statusDot(
                            row.status,
                          )}`}
                        />
                        {row.id}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{row.revenue}</TableCell>
                    <TableCell
                      className={`tabular-nums ${
                        row.vsMedianPositive ? 'text-emerald-600' : 'text-destructive'
                      }`}
                    >
                      {row.vsMedian}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.nights}</TableCell>
                    <TableCell className="tabular-nums">{row.adr}</TableCell>
                    <TableCell
                      className={`tabular-nums ${
                        row.vsPrevPositive ? 'text-emerald-600' : 'text-destructive'
                      }`}
                    >
                      {row.vsPrev}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function statusDot(status: 'healthy' | 'warning' | 'critical') {
  if (status === 'healthy') return 'bg-emerald-500';
  if (status === 'warning') return 'bg-amber-500';
  return 'bg-destructive';
}

function KpiCard({
  label,
  icon,
  value,
  visual,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  visual: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      <div className="mt-3">{visual}</div>
    </Card>
  );
}

function ForecastTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
    </div>
  );
}

function MiniSpark({
  data,
  color,
  gradId,
}: {
  data: { v: number }[];
  color: string;
  gradId: string;
}) {
  if (data.length < 2) return <div className="h-8 w-20" />;
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBars({ data }: { data: { v: number }[] }) {
  if (data.length === 0) return <div className="h-8 w-20" />;
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="v" fill="var(--muted-foreground)" radius={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
