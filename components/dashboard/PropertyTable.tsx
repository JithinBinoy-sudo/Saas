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
  'revenue' | 'occupied_nights' | 'adr' | 'revenue_delta'
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
  if (value == null) return <span className="text-slate-400">–</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        value > 0 && 'text-green-600',
        value < 0 && 'text-red-600',
        value === 0 && 'text-slate-400'
      )}
    >
      {value > 0 ? '↑' : value < 0 ? '↓' : ''}
      {fmtDelta(value)}
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
      className={cn('cursor-pointer select-none hover:bg-slate-50', className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-xs">{currentDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </TableHead>
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
        aVal = (a.portfolio_median_revenue != null) ? a.revenue - a.portfolio_median_revenue : 0;
        bVal = (b.portfolio_median_revenue != null) ? b.revenue - b.portfolio_median_revenue : 0;
      } else {
        aVal = (a[sortKey] as number) ?? 0;
        bVal = (b[sortKey] as number) ?? 0;
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Property Breakdown
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <SortableHeader
              label="Revenue"
              sortKey="revenue"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="vs Median"
              sortKey="vs_median"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="hidden md:table-cell"
            />
            <SortableHeader
              label="Nights"
              sortKey="occupied_nights"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="ADR"
              sortKey="adr"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="vs Prev Month"
              sortKey="revenue_delta"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="hidden md:table-cell"
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
              <TableRow key={row.listing_id}>
                <TableCell className="font-medium text-slate-900">
                  {row.listing_nickname || row.listing_id}
                </TableCell>
                <TableCell>{fmtCurrency(row.revenue)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <DeltaCell value={vsMedian} />
                </TableCell>
                <TableCell>{row.occupied_nights}</TableCell>
                <TableCell>{fmtCurrency(row.adr)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <DeltaCell value={row.revenue_delta} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
