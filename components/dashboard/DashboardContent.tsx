'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MonthPicker } from './MonthPicker';
import { PropertyTable } from './PropertyTable';
import { cn } from '@/lib/utils';
import type {
  DashboardData,
  MonthlyPortfolioSummary,
  PropertyMonthRow,
} from '@/lib/analytics/types';

type Metric = 'revenue' | 'occupancy' | 'adr';

type Props = DashboardData & {
  headerRight?: React.ReactNode;
};

function fmtCurrencyLong(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtCurrencyShort(n: number): string {
  if (n >= 1000) {
    return `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPercent(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

function fmtNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function daysInMonth(isoDate: string): number {
  const d = new Date(isoDate);
  return new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getUTCDate();
}

function occupancyFor(
  totalNights: number,
  propertyCount: number,
  isoMonth: string
): number {
  if (!propertyCount) return 0;
  const days = daysInMonth(isoMonth);
  const max = propertyCount * days;
  if (!max) return 0;
  return Math.min(100, (totalNights / max) * 100);
}

function rowLabel(p: PropertyMonthRow): string {
  const n = p.listing_nickname?.trim();
  return n || p.listing_id;
}

function aggregateRowsCurrent(
  rows: PropertyMonthRow[],
  revenueMonth: string
): MonthlyPortfolioSummary {
  const total_nights = rows.reduce((s, p) => s + p.occupied_nights, 0);
  const total_revenue = rows.reduce((s, p) => s + p.revenue, 0);
  return {
    revenue_month: revenueMonth,
    property_count: rows.length,
    total_nights,
    total_revenue,
    portfolio_adr: total_nights > 0 ? total_revenue / total_nights : 0,
  };
}

/** Prior-month totals inferred from current row + MoM deltas (same logic as SQL LAG). */
function aggregateRowsPrior(
  rows: PropertyMonthRow[],
  priorMonthLabel: string
): MonthlyPortfolioSummary {
  let total_revenue = 0;
  let total_nights = 0;
  for (const p of rows) {
    total_revenue +=
      p.revenue_delta != null ? p.revenue - p.revenue_delta : 0;
    total_nights +=
      p.nights_delta != null ? p.occupied_nights - p.nights_delta : 0;
  }
  return {
    revenue_month: priorMonthLabel,
    property_count: rows.length,
    total_nights,
    total_revenue,
    portfolio_adr: total_nights > 0 ? total_revenue / total_nights : 0,
  };
}

function scalePortfolioTrend(
  trend: MonthlyPortfolioSummary[],
  full: MonthlyPortfolioSummary,
  scoped: MonthlyPortfolioSummary,
  metric: Metric
): MonthlyPortfolioSummary[] {
  if (metric === 'revenue') {
    const scale =
      full.total_revenue !== 0
        ? scoped.total_revenue / full.total_revenue
        : 0;
    return trend.map((d) => ({
      ...d,
      total_revenue: d.total_revenue * scale,
    }));
  }
  if (metric === 'adr') {
    const scale =
      full.portfolio_adr !== 0
        ? scoped.portfolio_adr / full.portfolio_adr
        : 0;
    return trend.map((d) => ({
      ...d,
      portfolio_adr: d.portfolio_adr * scale,
    }));
  }
  const scaleN =
    full.total_nights !== 0 ? scoped.total_nights / full.total_nights : 0;
  const scaleC =
    full.property_count !== 0
      ? scoped.property_count / full.property_count
      : 0;
  return trend.map((d) => ({
    ...d,
    total_nights: Math.max(0, Math.round(d.total_nights * scaleN)),
    property_count: Math.max(1, Math.round(d.property_count * scaleC)),
  }));
}

function createSmoothPath(
  data: number[],
  width: number,
  height: number
): {
  path: string;
  fillPath: string;
  points: { x: number; y: number }[];
} {
  if (data.length < 2) return { path: '', fillPath: '', points: [] };
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.1;
  const range = max - min || 1;

  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((val - min) / range) * height,
  }));

  const pathCmds = points.map((p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `C ${cpX},${prev.y} ${cpX},${p.y} ${p.x},${p.y}`;
  });

  const path = pathCmds.join(' ');
  const fillPath = `${path} L ${width},${height} L 0,${height} Z`;

  return { path, fillPath, points };
}

export function DashboardContent({
  availableMonths,
  selectedMonth,
  summary,
  priorSummary,
  trendData,
  properties,
  headerRight,
  forecastPoint,
}: Props) {
  const [activeMetric, setActiveMetric] = useState<Metric>('revenue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const valid = new Set(properties.map((p) => p.listing_id));
    setSelectedListingIds((prev) => prev.filter((id) => valid.has(id)));
  }, [properties]);

  const selectionRows = useMemo(
    () =>
      properties.filter((p) => selectedListingIds.includes(p.listing_id)),
    [properties, selectedListingIds]
  );
  const selectionActive = selectionRows.length > 0;
  const singlePropertySelection = selectedListingIds.length === 1;

  const effectiveSummary = useMemo(() => {
    if (!summary) return null;
    if (!selectionActive) return summary;
    return aggregateRowsCurrent(selectionRows, summary.revenue_month);
  }, [summary, selectionActive, selectionRows]);

  const effectivePriorSummary = useMemo(() => {
    if (!selectionActive || !summary) return priorSummary;
    const priorMonth =
      priorSummary?.revenue_month ?? summary.revenue_month;
    return aggregateRowsPrior(selectionRows, priorMonth);
  }, [selectionActive, selectionRows, summary, priorSummary]);

  const chartTrendData = useMemo(() => {
    if (!selectionActive || !summary || !effectiveSummary) return trendData;
    return scalePortfolioTrend(
      trendData,
      summary,
      effectiveSummary,
      activeMetric
    );
  }, [
    selectionActive,
    summary,
    effectiveSummary,
    trendData,
    activeMetric,
  ]);

  const view = useMemo(() => {
    const s = effectiveSummary;
    const p = effectivePriorSummary;
    if (activeMetric === 'revenue') {
      const current = s?.total_revenue ?? 0;
      const prior = p?.total_revenue ?? 0;
      const values =
        chartTrendData.length > 0
          ? chartTrendData.map((d) => d.total_revenue)
          : [0, 100];
      return {
        label: 'Portfolio Performance',
        headline: fmtCurrencyLong(current),
        pointLabel: fmtCurrencyShort(current),
        axisFmt: fmtCurrencyShort,
        current,
        prior,
        values,
      };
    }
    if (activeMetric === 'adr') {
      const current = s?.portfolio_adr ?? 0;
      const prior = p?.portfolio_adr ?? 0;
      const values =
        chartTrendData.length > 0
          ? chartTrendData.map((d) => d.portfolio_adr)
          : [0, 100];
      return {
        label: 'Average Daily Rate',
        headline: fmtCurrencyLong(current),
        pointLabel: fmtCurrencyShort(current),
        axisFmt: fmtCurrencyShort,
        current,
        prior,
        values,
      };
    }
    const currentPct = s
      ? occupancyFor(s.total_nights, s.property_count, s.revenue_month)
      : 0;
    const priorPct = p
      ? occupancyFor(p.total_nights, p.property_count, p.revenue_month)
      : 0;
    const values =
      chartTrendData.length > 0
        ? chartTrendData.map((d) =>
            occupancyFor(d.total_nights, d.property_count, d.revenue_month)
          )
        : [0, 100];
    return {
      label: 'Occupancy Rate',
      headline: fmtPercent(currentPct),
      pointLabel: fmtPercent(currentPct),
      axisFmt: (n: number) => fmtPercent(n),
      current: currentPct,
      prior: priorPct,
      values,
    };
  }, [activeMetric, effectiveSummary, effectivePriorSummary, chartTrendData]);

  const MoM =
    view.prior > 0 ? ((view.current - view.prior) / view.prior) * 100 : null;

  const { path: trendPath, fillPath: trendFill, points: trendPoints } = useMemo(
    () => createSmoothPath(view.values, 1000, 200),
    [view.values]
  );
  const lastPoint =
    trendPoints.length > 0
      ? trendPoints[trendPoints.length - 1]
      : { x: 1000, y: 100 };

  // Compute forecast point coordinates on the SVG (only for revenue metric)
  const forecastCoords = useMemo(() => {
    if (!forecastPoint || activeMetric !== 'revenue' || view.values.length < 2) return null;

    const allValues = view.values;
    const min = Math.min(...allValues) * 0.9;
    const max = Math.max(...allValues) * 1.1;
    const range = max - min || 1;

    // X position: one step beyond the last point
    const stepX = 1000 / (allValues.length - 1);
    const fcX = lastPoint.x + stepX;

    // Y position: map predicted_revenue to the same scale
    const fcY = 200 - ((forecastPoint.predicted_revenue - min) / range) * 200;

    // Confidence band Y positions
    let lowerY: number | null = null;
    let upperY: number | null = null;
    if (forecastPoint.lower_bound != null) {
      lowerY = 200 - ((forecastPoint.lower_bound - min) / range) * 200;
    }
    if (forecastPoint.upper_bound != null) {
      upperY = 200 - ((forecastPoint.upper_bound - min) / range) * 200;
    }

    return { x: Math.min(fcX, 1050), y: fcY, lowerY, upperY };
  }, [forecastPoint, activeMetric, view.values, lastPoint.x]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return properties.filter((p) => {
      const nick = (p.listing_nickname || '').toLowerCase();
      const id = (p.listing_id || '').toLowerCase();
      return nick.includes(q) || id.includes(q);
    });
  }, [properties, searchQuery]);

  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      const nick = (p.listing_nickname || '').toLowerCase();
      const id = (p.listing_id || '').toLowerCase();
      return nick.includes(q) || id.includes(q);
    });
  }, [properties, searchQuery]);

  const propertyTableRows = useMemo(() => {
    if (singlePropertySelection) return [];
    if (selectedListingIds.length > 1) {
      return selectedListingIds
        .map((id) => properties.find((p) => p.listing_id === id))
        .filter((p): p is PropertyMonthRow => p != null);
    }
    return filteredProperties;
  }, [
    singlePropertySelection,
    selectedListingIds,
    properties,
    filteredProperties,
  ]);

  const occupancyCardPct = effectiveSummary
    ? occupancyFor(
        effectiveSummary.total_nights,
        effectiveSummary.property_count,
        effectiveSummary.revenue_month
      )
    : 0;

  const valueMax = Math.max(...view.values);
  const valueMin = Math.min(...view.values);

  function toggleListingSelection(listingId: string) {
    setSelectedListingIds((prev) =>
      prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId]
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full flex justify-between items-center mb-2 gap-4">
        <h1 className="text-2xl font-headline font-bold tracking-tight text-on-surface">
          Portfolio Overview
        </h1>
        <div className="flex items-center gap-4">
          {headerRight}
          <MonthPicker
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
          />
          <div ref={searchWrapRef} className="flex w-80 shrink-0 flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search properties..."
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen}
                aria-haspopup="listbox"
                aria-controls="property-search-listbox"
                className="relative z-0 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-[0px_4px_20px_rgba(0,0,0,0.2)]"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">
                  search
                </span>
              </div>
              {searchOpen && searchQuery.trim() !== '' && (
                <ul
                  id="property-search-listbox"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-surface-container-high py-1 shadow-[0px_16px_40px_rgba(0,0,0,0.55)]"
                >
                  {searchMatches.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-on-surface-variant">
                      No matching properties
                    </li>
                  ) : (
                    searchMatches.map((p) => {
                      const selected = selectedListingIds.includes(p.listing_id);
                      return (
                        <li key={p.listing_id} role="option" aria-selected={selected}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                              selected
                                ? 'bg-primary/15 text-primary'
                                : 'text-on-surface hover:bg-white/5'
                            )}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              toggleListingSelection(p.listing_id);
                              setSearchQuery('');
                              setSearchOpen(false);
                            }}
                          >
                            <span className="truncate">{rowLabel(p)}</span>
                            {selected ? (
                              <span className="material-symbols-outlined shrink-0 text-base">
                                check
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                                Add
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
            {selectedListingIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedListingIds.map((id) => {
                  const p = properties.find((x) => x.listing_id === id);
                  if (!p) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-surface-container-high py-0.5 pl-2.5 pr-1 text-xs text-on-surface"
                    >
                      <span className="truncate">{rowLabel(p)}</span>
                      <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-white/10 hover:text-on-surface"
                        aria-label={`Remove ${rowLabel(p)}`}
                        onClick={() =>
                          setSelectedListingIds((prev) =>
                            prev.filter((x) => x !== id)
                          )
                        }
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          close
                        </span>
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary-dim"
                  onClick={() => {
                    setSelectedListingIds([]);
                    setSearchQuery('');
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 items-stretch gap-6">
        {/* Card 1: Portfolio Performance */}
        <div className="col-span-8 flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-surface-container/60 backdrop-blur-xl ghost-border relative shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="p-8 pb-0">
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-6 border-b border-white/5 pb-2 relative z-10">
                <TabButton
                  active={activeMetric === 'revenue'}
                  onClick={() => setActiveMetric('revenue')}
                >
                  Total Revenue
                </TabButton>
                <TabButton
                  active={activeMetric === 'occupancy'}
                  onClick={() => setActiveMetric('occupancy')}
                >
                  Occupancy Rate
                </TabButton>
                <TabButton
                  active={activeMetric === 'adr'}
                  onClick={() => setActiveMetric('adr')}
                >
                  ADR
                </TabButton>
              </div>
              <span className="text-xs text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full relative z-10">
                {selectionActive
                  ? `${fmtNumber(selectedListingIds.length)} selected`
                  : `${fmtNumber(properties.length)} properties`}
              </span>
            </div>

            <div className="mb-8 relative z-10">
              <h2 className="text-on-surface-variant text-sm uppercase tracking-wider mb-2">
                {view.label}
              </h2>
              <div className="flex items-end gap-4">
                <span className="text-6xl font-headline font-semibold tracking-tight text-on-surface">
                  {view.headline}
                </span>
                {MoM !== null && (
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded-md mb-2 flex items-center gap-1 border ${
                      MoM >= 0
                        ? 'bg-tertiary/10 text-tertiary border-tertiary/20'
                        : 'bg-error/10 text-error border-error/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {MoM >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {MoM > 0 ? '+' : ''}
                    {Math.abs(MoM).toFixed(1)}% M/M
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-auto min-h-[11rem] w-full flex-1 border-t border-white/5 bg-gradient-to-t from-primary/5 to-transparent">
            <svg
              className="w-full h-full absolute bottom-0 left-0"
              preserveAspectRatio="none"
              viewBox="0 0 1000 200"
            >
              <defs>
                <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#85adff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#85adff" stopOpacity="0" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path d={trendFill} fill="url(#wave-gradient)" />
              <path
                d={trendPath}
                fill="none"
                stroke="#85adff"
                strokeWidth="3"
                filter="url(#glow)"
              />
            </svg>
          </div>
        </div>

        {/* Right column KPIs — same row height as main card; cards fill 2×2 grid */}
        <div className="col-span-4 flex h-full min-h-0 flex-col gap-6">
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4">
            <DashboardKpiCard
              label="Active Properties"
              value={fmtNumber(effectiveSummary?.property_count || 0)}
              icon="calendar_month"
              iconClassName="text-tertiary"
              glowClassName="bg-tertiary/10 group-hover:bg-tertiary/20"
              showGrip
            />
            <DashboardKpiCard
              label="Nights Sold"
              value={fmtNumber(effectiveSummary?.total_nights || 0)}
              icon="dark_mode"
              iconClassName="text-secondary"
              glowClassName="bg-secondary/10 group-hover:bg-secondary/20"
            />
            <DashboardKpiCard
              label="Portfolio ADR"
              value={fmtCurrencyLong(effectiveSummary?.portfolio_adr || 0)}
              icon="price_change"
              iconClassName="text-primary"
              glowClassName="bg-primary/10 group-hover:bg-primary/20"
            />
            <DashboardKpiCard
              label="Occupancy"
              value={fmtPercent(occupancyCardPct)}
              icon="pie_chart"
              iconClassName="text-tertiary"
              glowClassName="bg-tertiary/10 group-hover:bg-tertiary/25"
            />
          </div>
        </div>

        {/* Card 4: Revenue Trends */}
        <div className="col-span-12 bg-surface-container/60 backdrop-blur-xl rounded-xl ghost-border p-8 mt-2 relative shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h3 className="text-on-surface font-semibold text-lg">
                {view.label} Trend
              </h3>
              <span className="bg-surface-bright text-on-surface-variant text-xs px-2 py-0.5 rounded border border-white/10">
                MoM
              </span>
            </div>
          </div>

          <div className="h-64 relative flex items-end">
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-on-surface-variant pb-8 pr-4 border-r border-white/5">
              <span>{view.axisFmt(valueMax * 1.1)}</span>
              <span>{view.axisFmt(valueMax * 0.73)}</span>
              <span>{view.axisFmt(valueMax * 0.36)}</span>
              <span>{view.axisFmt(valueMin * 0.9)}</span>
            </div>

            <div className="w-full h-full pl-12 relative pb-8">
              <div className="absolute inset-0 pl-12 flex flex-col justify-between pointer-events-none pb-8 opacity-20">
                <div className="w-full h-[1px] bg-outline-variant"></div>
                <div className="w-full h-[1px] bg-outline-variant"></div>
                <div className="w-full h-[1px] bg-outline-variant"></div>
                <div className="w-full h-[1px] bg-outline-variant"></div>
              </div>

              <svg
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 1000 200"
              >
                <defs>
                  <linearGradient
                    id="line-gradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#85adff" />
                    <stop offset="100%" stopColor="#c180ff" />
                  </linearGradient>
                  <filter id="glow-line">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d={trendPath}
                  fill="none"
                  stroke="url(#line-gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#glow-line)"
                />

                {trendPoints.length > 0 && (
                  <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
                    <circle
                      cx="0"
                      cy="0"
                      r="6"
                      fill="#0e0e10"
                      stroke="#c180ff"
                      strokeWidth="3"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="12"
                      fill="none"
                      stroke="#c180ff"
                      strokeWidth="2"
                      className="glow-point opacity-50"
                    />
                    <rect
                      x="-35"
                      y="-40"
                      width="70"
                      height="24"
                      rx="12"
                      fill="#262528"
                      stroke="#48474a"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-24"
                      textAnchor="middle"
                      fill="#f9f5f8"
                      fontFamily="Inter"
                      fontWeight="600"
                      fontSize="12"
                    >
                      {view.pointLabel}
                    </text>
                  </g>
                )}

                {/* Forecast overlay */}
                {forecastCoords && forecastPoint && (
                  <g>
                    {/* Confidence band */}
                    {forecastCoords.lowerY != null && forecastCoords.upperY != null && (
                      <rect
                        x={forecastCoords.x - 15}
                        y={Math.min(forecastCoords.upperY, forecastCoords.lowerY)}
                        width={30}
                        height={Math.abs(forecastCoords.lowerY - forecastCoords.upperY)}
                        rx={4}
                        fill="#adaaad"
                        fillOpacity={0.08}
                      />
                    )}

                    {/* Dashed connector line */}
                    <line
                      x1={lastPoint.x}
                      y1={lastPoint.y}
                      x2={forecastCoords.x}
                      y2={forecastCoords.y}
                      stroke="#adaaad"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                    />

                    {/* Forecast point — hollow dashed circle + inner dot */}
                    <circle
                      cx={forecastCoords.x}
                      cy={forecastCoords.y}
                      r={8}
                      fill="none"
                      stroke="#adaaad"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={forecastCoords.x}
                      cy={forecastCoords.y}
                      r={3}
                      fill="#adaaad"
                    />

                    {/* Label chip */}
                    <rect
                      x={forecastCoords.x - 45}
                      y={forecastCoords.y - 40}
                      width={90}
                      height={22}
                      rx={10}
                      fill="#262528"
                      stroke="#48474a"
                      strokeWidth={1}
                    />
                    <text
                      x={forecastCoords.x}
                      y={forecastCoords.y - 25}
                      textAnchor="middle"
                      fill="#adaaad"
                      fontFamily="Inter"
                      fontSize={10}
                    >
                      Forecast ({forecastPoint.model_used === 'prophet' ? 'Prophet' : 'ARIMA'})
                    </text>
                  </g>
                )}
              </svg>

              <div className="absolute bottom-0 left-12 w-full flex justify-between text-xs text-on-surface-variant px-4">
                {chartTrendData.map((d, i) => (
                  <span key={i}>
                    {new Date(d.revenue_month).toLocaleDateString('en-US', {
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </span>
                ))}
              </div>

              {/* Forecast legend */}
              {forecastPoint && activeMetric === 'revenue' && (
                <div className="absolute bottom-0 right-4 flex items-center gap-2 text-xs text-on-surface-variant">
                  <svg width="20" height="2" className="inline-block">
                    <line x1="0" y1="1" x2="20" y2="1" stroke="#adaaad" strokeWidth="2" strokeDasharray="4 3" />
                  </svg>
                  <span>Forecast</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!singlePropertySelection && (
        <PropertyTable rows={propertyTableRows} />
      )}
      {selectedListingIds.length === 0 &&
        properties.length > 0 &&
        filteredProperties.length === 0 && (
          <div className="bg-surface-container/60 backdrop-blur-xl rounded-xl ghost-border p-8 text-center text-on-surface-variant shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
            No properties match &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
    </div>
  );
}

function DashboardKpiCard({
  label,
  value,
  icon,
  iconClassName,
  glowClassName,
  showGrip = false,
}: {
  label: string;
  value: string;
  icon: string;
  iconClassName: string;
  glowClassName: string;
  showGrip?: boolean;
}) {
  return (
    <div
      className={cn(
        'group relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] bg-surface-container/60 p-6',
        'backdrop-blur-xl ghost-border shadow-[0px_20px_40px_rgba(0,0,0,0.4)]'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full blur-[20px] transition-all',
          glowClassName
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            'material-symbols-outlined shrink-0 text-[26px] leading-none',
            iconClassName
          )}
          aria-hidden
        >
          {icon}
        </span>
        {showGrip ? (
          <div
            className="grid shrink-0 grid-cols-3 gap-1 opacity-20"
            aria-hidden
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-white" />
            ))}
          </div>
        ) : null}
      </div>
      <p className="relative mb-2 mt-5 text-[11px] font-medium uppercase leading-snug tracking-[0.14em] text-on-surface-variant">
        {label}
      </p>
      <p className="relative mt-auto text-3xl font-bold tabular-nums tracking-tight text-on-surface">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'text-on-surface font-semibold text-sm border-b-2 border-primary pb-2 -mb-[9px]'
          : 'text-on-surface-variant hover:text-on-surface text-sm transition-colors pb-2'
      }
    >
      {children}
    </button>
  );
}
