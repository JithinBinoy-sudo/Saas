'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>From</Label>
          <select
            value={fromMonth}
            onChange={(e) => {
              setFromMonth(e.target.value);
              if (e.target.value > toMonth) setToMonth(e.target.value);
              setState('idle');
            }}
            className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
            disabled={availableMonths.length === 0}
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>To</Label>
          <select
            value={toMonth}
            onChange={(e) => {
              setToMonth(e.target.value);
              if (e.target.value < fromMonth) setFromMonth(e.target.value);
              setState('idle');
            }}
            className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
            disabled={availableMonths.length === 0}
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleExport}
          disabled={state === 'loading' || availableMonths.length === 0}
        >
          {state === 'loading' ? 'Exporting…' : 'Export to Excel'}
        </Button>
      </div>

      {state === 'error' && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      {availableMonths.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No data available for export. Upload reservation data first.
        </p>
      )}
    </div>
  );
}
