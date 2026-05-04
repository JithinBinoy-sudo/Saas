'use client';

import { ArrowDownRight, ArrowUpRight, Building2, X } from 'lucide-react';
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
import type { Property } from '@/lib/adapters/property';
import type { Risk } from '@/lib/adapters/risk';

type Props = {
  properties: Property[];
  filterActive: boolean;
  onClearFilter: () => void;
};

export function PropertyTable({ properties, filterActive, onClearFilter }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold">Property Breakdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Trailing 30 days · sorted by risk
          </p>
        </div>
        {filterActive && (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-normal">
              filtered to at-risk only
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClearFilter}
              aria-label="Clear filter"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6 text-[10px] uppercase tracking-wider text-muted-foreground">
              Property
            </TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              Revenue
            </TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              vs Median
            </TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              Nights
            </TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              ADR
            </TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              vs Prev
            </TableHead>
            <TableHead className="pr-6 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
              Risk
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((p) => (
            <TableRow key={p.id} className="border-border">
              <TableCell className="pl-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-mono text-xs text-foreground">{p.id}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Delta value={p.vsMedian} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.nights}</TableCell>
              <TableCell className="text-right tabular-nums">
                ${p.adr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Delta value={p.vsPrev} />
              </TableCell>
              <TableCell className="pr-6 text-right">
                <RiskPill risk={p.risk} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {properties.length > 0 && (
        <div className="border-t border-border py-3 text-center">
          <span className="text-xs text-muted-foreground">
            Showing {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </span>
        </div>
      )}
    </Card>
  );
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const cls = positive ? 'text-emerald-600' : 'text-destructive';
  return (
    <span className={`inline-flex items-center justify-end gap-0.5 ${cls}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function RiskPill({ risk }: { risk: Risk }) {
  if (risk === 'High') {
    return <Badge variant="destructive">High</Badge>;
  }
  if (risk === 'Medium') {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100">
        Medium
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      Low
    </Badge>
  );
}
