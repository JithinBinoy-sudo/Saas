'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ExportState = 'idle' | 'loading' | 'error';

type Props = {
  availableMonths: string[];
};

export function ExportButton({ availableMonths }: Props) {
  const [fromMonth, setFromMonth] = useState(availableMonths[0] ?? '');
  const [toMonth, setToMonth] = useState(availableMonths[0] ?? '');
  const [state, setState] = useState<ExportState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleExport() {
    setState('loading');
    setErrorMsg('');

    try {
      // Build query params
      const params = new URLSearchParams();
      if (fromMonth === toMonth) {
        // Single month mode
        params.set('month', fromMonth.slice(0, 7));
      } else {
        params.set('from', fromMonth);
        params.set('to', toMonth);
      }

      const res = await fetch(`/api/export/reservations?${params.toString()}`);

      if (res.status === 413) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? 'Export too large. Use a narrower date range.');
        setState('error');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? `Error ${res.status}`);
        setState('error');
        return;
      }

      // Download the blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'portlio-export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState('idle');
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  }

  const formatMonth = (m: string) => {
    // Display "2026-03-01" as "Mar 2026"
    const d = new Date(m + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
        </span>
        <h2 className="text-sm font-semibold text-white/90">Select Date Range</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            From
          </Label>
          <Select
            value={fromMonth}
            onValueChange={(v) => {
              if (!v) return;
              setFromMonth(v);
              if (v > toMonth) setToMonth(v);
              setState('idle');
            }}
            disabled={availableMonths.length === 0}
          >
            <SelectTrigger className="h-[46px] w-full rounded-xl border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 hover:bg-black/35 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-black/30 dark:hover:bg-black/35">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-white/10 bg-zinc-900/95 text-zinc-100 shadow-[0px_20px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl">
              {availableMonths.map((m) => (
                <SelectItem
                  key={m}
                  value={m}
                  className="rounded-lg focus:bg-white/5 focus:text-white data-[highlighted]:bg-white/5 data-[highlighted]:text-white"
                >
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            To
          </Label>
          <Select
            value={toMonth}
            onValueChange={(v) => {
              if (!v) return;
              setToMonth(v);
              if (v < fromMonth) setFromMonth(v);
              setState('idle');
            }}
            disabled={availableMonths.length === 0}
          >
            <SelectTrigger className="h-[46px] w-full rounded-xl border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 hover:bg-black/35 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-black/30 dark:hover:bg-black/35">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-white/10 bg-zinc-900/95 text-zinc-100 shadow-[0px_20px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl">
              {availableMonths.map((m) => (
                <SelectItem
                  key={m}
                  value={m}
                  className="rounded-lg focus:bg-white/5 focus:text-white data-[highlighted]:bg-white/5 data-[highlighted]:text-white"
                >
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleExport}
        disabled={state === 'loading' || availableMonths.length === 0}
        className={cn(
          'h-11 w-full rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary-fixed hover:opacity-95',
          state === 'loading' && 'opacity-80'
        )}
      >
        <span className="material-symbols-outlined mr-2 text-[18px]" aria-hidden>
          download
        </span>
        {state === 'loading' ? 'Exporting…' : 'Export to Excel'}
      </Button>

      <p className="text-xs text-zinc-600">
        File will download immediately as a .xlsx format.
      </p>

      {state === 'error' && errorMsg && <p className="text-sm text-rose-400">{errorMsg}</p>}

      {availableMonths.length === 0 && (
        <p className="text-sm text-zinc-500">No data available for export. Upload reservation data first.</p>
      )}
    </div>
  );
}
