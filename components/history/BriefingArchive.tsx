'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';

export type BriefingArchiveRow = {
  id: string;
  revenue_month: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  model: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  generated_at: string;
  portfolio_summary: string | null;
  briefing_name: string | null;
};

type Props = {
  rows: BriefingArchiveRow[];
  totalCount: number;
  page: number;
  isAdmin: boolean;
  initialQuery: string;
};

const PAGE_SIZE = 20;

function formatMonthLabel(iso: string) {
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function briefingTitle(summary: string | null, revenueMonth: string) {
  if (!summary?.trim()) return `Portfolio briefing — ${revenueMonth}`;
  const line = summary.trim().split(/\n/)[0] ?? '';
  const shortened = line.length > 56 ? `${line.slice(0, 53)}…` : line;
  return shortened || `Portfolio briefing — ${revenueMonth}`;
}

function displayTitle(row: BriefingArchiveRow) {
  if (row.briefing_name?.trim()) return row.briefing_name;
  return briefingTitle(row.portfolio_summary, row.revenue_month);
}

function modelLabel(model: string | null) {
  if (!model) return '—';
  const meta = SUPPORTED_MODELS[model];
  return meta?.displayName ?? model;
}

function StatusPill({ status }: { status: BriefingArchiveRow['status'] }) {
  const { label, classes } = useMemo(() => {
    switch (status) {
      case 'complete':
        return {
          label: 'Completed',
          classes: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
        };
      case 'failed':
        return {
          label: 'Failed',
          classes: 'border-rose-400/35 bg-rose-400/10 text-rose-200',
        };
      case 'running':
        return {
          label: 'Running',
          classes: 'border-sky-400/35 bg-sky-400/10 text-sky-200',
        };
      case 'pending':
      default:
        return {
          label: 'Pending',
          classes: 'border-zinc-400/25 bg-white/5 text-zinc-200',
        };
    }
  }, [status]);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        classes
      )}
    >
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-zinc-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function RetryButton({ revenueMonth, model }: { revenueMonth: string; model: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRetry() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revenue_month: revenueMonth,
          model: model ?? 'gpt-4o',
          briefing_name: `Retry — ${revenueMonth}`,
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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100',
          'transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> Retrying…
          </span>
        ) : (
          'Retry'
        )}
      </button>
      {error && <p className="max-w-[22rem] text-right text-[11px] text-rose-300/90">{error}</p>}
    </div>
  );
}

function DeleteButton({
  revenueMonth,
  onDeleted,
}: {
  revenueMonth: string;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    const ok = window.confirm('Delete this briefing and remove it from the archive? This cannot be undone.');
    if (!ok) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/briefings/${encodeURIComponent(revenueMonth)}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      onDeleted();
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100',
          'transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="max-w-[22rem] text-right text-[11px] text-rose-300/90">{error}</p>}
    </div>
  );
}

export function BriefingArchive({ rows, totalCount, page, isAdmin, initialQuery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [localRows, setLocalRows] = useState(rows);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localRows;
    return localRows.filter((r) => displayTitle(r).toLowerCase().includes(q));
  }, [query, localRows]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function setQueryParam(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete('q');
    else params.set('q', value);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  }

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-28 h-[min(55vh,34rem)] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_55%),radial-gradient(ellipse_at_70%_0%,rgba(34,211,238,0.10),transparent_55%)]"
      />

      <div className="relative space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Archive</h1>
            <p className="mt-1 text-sm text-zinc-500">Search and review your generated briefings.</p>
          </div>

          <div className="w-full sm:max-w-md">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Search briefings
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 material-symbols-outlined text-[18px]">
                search
              </span>
              <input
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  setQueryParam(v.trim() ? v : null);
                }}
                placeholder="Search by briefing name…"
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.06]">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_auto] gap-4 border-b border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <div>Briefing name</div>
            <div>Date generated</div>
            <div>AI model</div>
            <div>Status</div>
            <div className="text-right">Action</div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-zinc-500">
              No briefings match your search.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {filtered.map((r, idx) => {
                const hue = idx % 2 === 0 ? 'from-sky-500/25 to-blue-600/10' : 'from-violet-500/25 to-fuchsia-600/10';
                const title = displayTitle(r);
                const dateLabel = formatMonthLabel(r.generated_at);
                const status = r.status;
                const deleteAction = isAdmin ? (
                  <DeleteButton
                    revenueMonth={r.revenue_month}
                    onDeleted={() => setLocalRows((prev) => prev.filter((x) => x.id !== r.id))}
                  />
                ) : null;

                const action =
                  status === 'complete' ? (
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/briefings/${r.revenue_month}`}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
                      >
                        View
                      </Link>
                      {deleteAction}
                    </div>
                  ) : status === 'failed' && isAdmin ? (
                    <div className="flex items-start justify-end gap-2">
                      <RetryButton revenueMonth={r.revenue_month} model={r.model} />
                      {deleteAction}
                    </div>
                  ) : status === 'running' || status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2">
                      <Spinner />
                      {deleteAction}
                    </div>
                  ) : (
                    <div className="flex justify-end">{deleteAction}</div>
                  );

                return (
                  <li key={r.id} className="px-6 py-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_auto] items-center gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10',
                            hue
                          )}
                        >
                          <span className="material-symbols-outlined text-[20px] text-white/90">description</span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{title}</div>
                          <div className="mt-0.5 text-xs text-zinc-500">Portfolio Strategy</div>
                        </div>
                      </div>

                      <div className="text-sm text-zinc-400">{dateLabel}</div>
                      <div className="text-sm text-zinc-400">{modelLabel(r.model)}</div>
                      <div>
                        <StatusPill status={status} />
                      </div>
                      <div className="flex justify-end">{action}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              Page {page} of {totalPages} — {totalCount} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => goToPage(page - 1)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => goToPage(page + 1)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

