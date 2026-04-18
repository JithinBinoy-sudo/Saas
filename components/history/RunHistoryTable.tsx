'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RunStatusBadge } from '@/components/history/RunStatusBadge';

export type PipelineRunRow = {
  id: string;
  revenue_month: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  model: string | null;
  triggered_by_name: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

type Props = {
  runs: PipelineRunRow[];
  totalCount: number;
  page: number;
  isAdmin: boolean;
};

const PAGE_SIZE = 20;

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '\u2014';
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (diffMs < 0) return '\u2014';
  const totalSeconds = Math.round(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-slate-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function ErrorRow({ message }: { message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-destructive underline-offset-2 hover:underline"
      >
        {open ? 'Hide error' : 'Show error'}
      </button>
      {open && (
        <pre className="mt-1 max-w-xs whitespace-pre-wrap break-words rounded bg-red-50 p-2 text-xs text-red-700">
          {message}
        </pre>
      )}
    </div>
  );
}

function ReRunButton({
  revenueMonth,
  model,
}: {
  revenueMonth: string;
  model: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleReRun() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revenue_month: revenueMonth,
          model: model ?? 'gpt-4o',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Error ${res.status}`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={handleReRun}
        className="h-7 px-2 text-xs"
      >
        {loading ? (
          <span className="flex items-center gap-1">
            <SpinnerIcon /> Re-running...
          </span>
        ) : (
          'Re-run'
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function RunHistoryTable({ runs, totalCount, page, isAdmin }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasActiveRuns = runs.some(
    (r) => r.status === 'running' || r.status === 'pending'
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hasActiveRuns) {
      intervalRef.current = setInterval(() => {
        router.refresh();
      }, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasActiveRuns, router]);

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Triggered By</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  No pipeline runs found.
                </TableCell>
              </TableRow>
            )}
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium">{run.revenue_month}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <RunStatusBadge status={run.status} />
                    {run.status === 'failed' && run.error_message && (
                      <ErrorRow message={run.error_message} />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">
                  {run.model ?? <span className="text-slate-400">\u2014</span>}
                </TableCell>
                <TableCell className="text-slate-600">
                  {run.triggered_by_name ?? (
                    <span className="text-slate-400">System</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">
                  {new Date(run.started_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatDuration(run.started_at, run.completed_at)}
                </TableCell>
                <TableCell>
                  {run.status === 'complete' && (
                    <Link
                      href={`/dashboard/briefings/${run.revenue_month}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View Briefing
                    </Link>
                  )}
                  {run.status === 'failed' && isAdmin && (
                    <ReRunButton
                      revenueMonth={run.revenue_month}
                      model={run.model}
                    />
                  )}
                  {(run.status === 'running' || run.status === 'pending') && (
                    <SpinnerIcon />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} &mdash; {totalCount} total runs
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
