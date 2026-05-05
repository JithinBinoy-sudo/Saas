import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createAppServerClient } from '@/lib/supabase/server';
import { fetchDashboardData } from '@/lib/analytics/queries';
import { toChartData } from '@/lib/adapters/chart';
import { toKpis } from '@/lib/adapters/kpis';
import { toProperties } from '@/lib/adapters/property';
import {
  BriefingDetailView,
  type BriefingBreakdownRow,
  type BriefingDetailKpis,
  type BriefingForecast,
} from '@/components/briefing/BriefingDetailView';

export const metadata = {
  title: 'Briefing · Portlio',
};

const SHORT_MONTH = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

const FULL_MONTH = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const SHORT_DATE = (iso: string | null | undefined) => {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPctSigned(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function summaryText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate =
      (typeof obj.summary === 'string' && obj.summary) ||
      (typeof obj.executive_summary === 'string' && obj.executive_summary) ||
      '';
    return candidate.trim() || null;
  }
  return null;
}

function statusFor(p: { vsMedian: number; vsPrev: number }): BriefingBreakdownRow['status'] {
  if (p.vsMedian < -50 || p.vsPrev < -40) return 'critical';
  if (p.vsMedian < -10 || p.vsPrev < -15) return 'warning';
  return 'healthy';
}

export default async function BriefingDetailPage({
  params,
}: {
  params: { briefingId: string };
}) {
  const monthIso = decodeURIComponent(params.briefingId);

  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (!userRow) return null;

  const { data: briefingRow } = await supabase
    .from('monthly_portfolio_briefings')
    .select('revenue_month, briefing_name, generated_at, model, portfolio_summary')
    .eq('company_id', userRow.company_id)
    .eq('revenue_month', monthIso)
    .maybeSingle();

  if (!briefingRow) {
    notFound();
  }

  const dashboardData = await fetchDashboardData(
    supabase,
    userRow.company_id,
    monthIso,
  );

  const kpis = toKpis(dashboardData.summary, dashboardData.priorSummary);
  const properties = toProperties(dashboardData.properties);
  const chartData = toChartData(dashboardData.trendData, dashboardData.forecastSeries);

  const lastTrendIso = dashboardData.trendData.length
    ? dashboardData.trendData[dashboardData.trendData.length - 1].revenue_month
    : null;
  const forecastBoundaryLabel = lastTrendIso ? SHORT_MONTH(lastTrendIso) : null;

  const expectedProperties = Math.max(
    kpis.propertyCount,
    dashboardData.summary?.property_count ?? 0,
  );
  const propertyProgress =
    expectedProperties > 0 ? (kpis.propertyCount / expectedProperties) * 100 : 0;

  const detailKpis: BriefingDetailKpis = {
    properties: {
      value: kpis.propertyCount.toString(),
      progress: propertyProgress,
    },
    adr: {
      value: fmtCurrency(kpis.adr.value),
      deltaLabel: kpis.adr.deltaPct != null ? fmtPctSigned(kpis.adr.deltaPct) : null,
      deltaPositive: (kpis.adr.deltaPct ?? 0) >= 0,
    },
    nights: {
      value: kpis.nights.value.toLocaleString(),
      sub: 'this month',
    },
    revenue: {
      value: fmtCurrency(kpis.revenue.value),
      deltaLabel:
        kpis.revenue.deltaPct != null ? fmtPctSigned(kpis.revenue.deltaPct) : null,
      deltaPositive: (kpis.revenue.deltaPct ?? 0) >= 0,
    },
  };

  const forecastPoint = dashboardData.forecastSeries[0] ?? null;
  const forecast: BriefingForecast = {
    nextMonthRevenue: forecastPoint
      ? fmtCurrency(forecastPoint.predicted_revenue)
      : '—',
    confidence: forecastPoint
      ? forecastPoint.lower_bound != null && forecastPoint.upper_bound != null
        ? '90%'
        : '—'
      : '—',
    risk:
      properties.filter((p) => p.risk === 'High').length > 0
        ? 'High'
        : properties.filter((p) => p.risk === 'Medium').length > 0
          ? 'Medium'
          : 'Low',
  };

  const breakdown: BriefingBreakdownRow[] = properties.slice(0, 12).map((p) => ({
    id: p.id,
    revenue: fmtCurrency(p.revenue),
    vsMedian: fmtPctSigned(p.vsMedian),
    vsMedianPositive: p.vsMedian >= 0,
    nights: p.nights,
    adr: fmtCurrency(p.adr),
    vsPrev: fmtPctSigned(p.vsPrev),
    vsPrevPositive: p.vsPrev >= 0,
    status: statusFor({ vsMedian: p.vsMedian, vsPrev: p.vsPrev }),
  }));

  const sparkUp = dashboardData.trendData.map((d) => ({ v: d.total_revenue }));
  const sparkDown = dashboardData.trendData.map((d) => ({ v: d.portfolio_adr }));
  const sparkBars = dashboardData.trendData.map((d) => ({ v: d.total_nights }));

  const monthLabel = `${FULL_MONTH(monthIso)} Portfolio Briefing`;
  const generatedOnLabel = `Generated on ${SHORT_DATE(briefingRow.generated_at)}`;
  const modelLabel = briefingRow.model ?? 'GPT-4o';

  return (
    <div className="w-full">
      <Link
        href="/archive"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to archive
      </Link>
      <div className="mt-6">
        <BriefingDetailView
          generatedOnLabel={generatedOnLabel}
          monthLabel={briefingRow.briefing_name?.trim() || monthLabel}
          modelLabel={modelLabel}
          kpis={detailKpis}
          summaryText={summaryText(briefingRow.portfolio_summary)}
          chartData={chartData}
          forecastBoundaryLabel={forecastBoundaryLabel}
          forecast={forecast}
          breakdown={breakdown}
          sparkUp={sparkUp}
          sparkDown={sparkDown}
          sparkBars={sparkBars}
        />
      </div>
    </div>
  );
}
