'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PropertyMonthRow } from '@/lib/analytics/types';

type Props = {
  rows: PropertyMonthRow[];
};

type SortKey = keyof Pick<
  PropertyMonthRow,
  'revenue' | 'occupied_nights' | 'adr' | 'revenue_delta' | 'risk_score'
> | 'vs_median';

type SortDir = 'asc' | 'desc';

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtDelta(n: number | null): string {
  if (n == null) return '–';
  const sign = n > 0 ? '+' : '';
  return `${sign}$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function DeltaCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-on-surface-variant">–</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-medium tabular-nums',
        value > 0 && 'text-[#4ADE80]',
        value < 0 && 'text-[#F87171]',
        value === 0 && 'text-on-surface-variant'
      )}
    >
      {value > 0 ? '↑' : value < 0 ? '↓' : ''}
      {fmtDelta(value)}
    </span>
  );
}

function RiskBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-on-surface-variant text-sm">—</span>;
  }

  if (score <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-tertiary/10 text-tertiary border-tertiary/20">
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden>
          check_circle
        </span>
        Low
      </span>
    );
  }

  if (score <= 60) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-secondary/10 text-secondary border-secondary/20">
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden>
          warning
        </span>
        Medium
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium bg-error/10 text-error border-error/20">
      <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden>
        error
      </span>
      High
    </span>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none text-on-surface-variant font-medium transition-colors hover:bg-white/5 hover:text-on-surface',
        'h-auto py-3.5 align-middle',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-[10px] leading-none opacity-90">
            {currentDir === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </TableHead>
  );
}

function PropertyCell({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span
        className="material-symbols-outlined shrink-0 text-on-surface-variant text-[20px] leading-none"
        aria-hidden
      >
        apartment
      </span>
      <span className="font-medium text-on-surface truncate">{label}</span>
    </div>
  );
}

export function PropertyTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortKey === 'vs_median') {
        aVal =
          a.portfolio_median_revenue != null
            ? a.revenue - a.portfolio_median_revenue
            : 0;
        bVal =
          b.portfolio_median_revenue != null
            ? b.revenue - b.portfolio_median_revenue
            : 0;
      } else {
        aVal = (a[sortKey] as number) ?? 0;
        bVal = (b[sortKey] as number) ?? 0;
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) return null;

  const rowCellClass = 'py-4 align-middle text-on-surface tabular-nums';
  const headCellClass =
    'text-on-surface-variant font-medium h-auto py-3.5 align-middle';

  return (
    <div
      className={cn(
        'mt-6 rounded-3xl ghost-border relative overflow-hidden shadow-[0px_20px_40px_rgba(0,0,0,0.4)]',
        'bg-[#121212] backdrop-blur-xl'
      )}
    >
      <div className="p-8">
        <h3 className="text-on-surface font-semibold text-lg tracking-tight mb-6">
          Property Breakdown
        </h3>

        <div className="w-full overflow-x-auto -mx-1 px-1">
          <Table className="table-fixed min-w-[840px] w-full text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-white/5 hover:bg-transparent">
                <TableHead
                  className={cn(
                    headCellClass,
                    'text-left pl-0 pr-4 font-medium'
                  )}
                >
                  Property
                </TableHead>
                <SortableHeader
                  label="Revenue"
                  sortKey="revenue"
                  currentSort={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-left px-2"
                />
                <SortableHeader
                  label="vs Median"
                  sortKey="vs_median"
                  currentSort={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-left px-2"
                />
                <SortableHeader
                  label="Nights"
                  sortKey="occupied_nights"
                  currentSort={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-left px-2"
                />
                <SortableHeader
                  label="ADR"
                  sortKey="adr"
                  currentSort={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-left px-2"
                />
                <SortableHeader
                  label="vs Prev Month"
                  sortKey="revenue_delta"
                  currentSort={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-left px-2"
                />
                <SortableHeader
                  label="Risk"
                  sortKey="risk_score"
                  currentSort={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-left pl-2 pr-0"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const vsMedian =
                  row.portfolio_median_revenue != null
                    ? row.revenue - row.portfolio_median_revenue
                    : null;

                return (
                  <TableRow
                    key={row.listing_id}
                    className="border-b border-white/5 hover:bg-white/[0.04] data-[state=selected]:bg-transparent transition-colors"
                  >
                    <TableCell className={cn(rowCellClass, 'pl-0 pr-4')}>
                      <PropertyCell
                        label={row.listing_nickname || row.listing_id}
                      />
                    </TableCell>
                    <TableCell className={cn(rowCellClass, 'px-2')}>
                      {fmtCurrency(row.revenue)}
                    </TableCell>
                    <TableCell className={cn(rowCellClass, 'px-2')}>
                      <DeltaCell value={vsMedian} />
                    </TableCell>
                    <TableCell className={cn(rowCellClass, 'px-2')}>
                      {row.occupied_nights}
                    </TableCell>
                    <TableCell className={cn(rowCellClass, 'px-2')}>
                      {fmtCurrency(row.adr)}
                    </TableCell>
                    <TableCell className={cn(rowCellClass, 'px-2')}>
                      <DeltaCell value={row.revenue_delta} />
                    </TableCell>
                    <TableCell className={cn(rowCellClass, 'pl-2 pr-0')}>
                      <RiskBadge score={row.risk_score} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
