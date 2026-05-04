'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { RiskBanner } from '@/components/dashboard/RiskBanner';
import { PropertyTable } from '@/components/dashboard/PropertyTable';
import { RecentBriefings } from '@/components/dashboard/RecentBriefings';
import { GenerateBriefingDialog } from '@/components/dashboard/GenerateBriefingDialog';
import { ForecastAutoTrigger } from '@/components/dashboard/ForecastAutoTrigger';
import type { Property } from '@/lib/adapters/property';
import type { ChartPoint } from '@/lib/adapters/chart';
import type { KpiData } from '@/lib/adapters/kpis';
import type { BriefingSummary } from '@/lib/adapters/briefing';

type MonthOption = { value: string; label: string };

type Props = {
  selectedMonth: string; // 'YYYY-MM'
  selectedMonthIso: string; // 'YYYY-MM-DD'
  monthOptions: MonthOption[];
  yearOptions: string[];
  kpis: KpiData;
  chartData: ChartPoint[];
  forecastBoundaryLabel: string | null;
  forecastModelLabel: string;
  asOfLabel: string;
  hasForecast: boolean;
  properties: Property[];
  briefings: BriefingSummary[];
};

const RISK_RANK = { High: 0, Medium: 1, Low: 2 } as const;

export function DashboardView({
  selectedMonth,
  selectedMonthIso,
  monthOptions,
  yearOptions,
  kpis,
  chartData,
  forecastBoundaryLabel,
  forecastModelLabel,
  asOfLabel,
  hasForecast,
  properties,
  briefings,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilterActive, setRiskFilterActive] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return properties.filter((p) => {
      if (riskFilterActive && p.risk === 'Low') return false;
      if (q && !p.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [properties, riskFilterActive, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || b.revenue - a.revenue,
    );
  }, [filtered]);

  const atRiskCount = useMemo(
    () => properties.filter((p) => p.risk !== 'Low').length,
    [properties],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        selectedMonth={selectedMonth}
        monthOptions={monthOptions}
        yearOptions={yearOptions}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onGenerateClick={() => setBriefingOpen(true)}
      />
      <KpiStrip kpis={kpis} chartData={chartData} />
      <div className="space-y-2">
        <PerformanceChart
          chartData={chartData}
          forecastBoundaryLabel={forecastBoundaryLabel}
          modelLabel={forecastModelLabel}
          asOfLabel={asOfLabel}
        />
        <ForecastAutoTrigger
          selectedMonth={selectedMonthIso}
          hasForecast={hasForecast}
        />
      </div>
      <RiskBanner
        count={atRiskCount}
        active={riskFilterActive}
        onToggle={() => setRiskFilterActive((v) => !v)}
      />
      <PropertyTable
        properties={sorted}
        filterActive={riskFilterActive}
        onClearFilter={() => setRiskFilterActive(false)}
      />
      <RecentBriefings briefings={briefings} />
      <GenerateBriefingDialog
        open={briefingOpen}
        onOpenChange={setBriefingOpen}
        defaultMonth={selectedMonth}
        yearOptions={yearOptions}
      />
    </div>
  );
}
