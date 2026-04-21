'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import type { AIProviderName } from '@/lib/pipeline/types';

export type RecentBriefing = {
  revenue_month: string;
  portfolio_summary: string | null;
  generated_at: string;
  model: string | null;
  briefing_name?: string | null;
};

type Props = {
  availableMonths: string[];
  defaultModel: string;
  recentBriefings: RecentBriefing[];
  configuredProviders: AIProviderName[];
};

const MODEL_ENTRIES = Object.entries(SUPPORTED_MODELS);

function formatMonthLabel(iso: string) {
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function briefingTitle(summary: string | null, revenueMonth: string) {
  if (!summary?.trim()) return `Portfolio briefing — ${formatMonthLabel(revenueMonth)}`;
  const line = summary.trim().split(/\n/)[0] ?? '';
  const shortened = line.length > 56 ? `${line.slice(0, 53)}…` : line;
  return shortened || `Portfolio briefing — ${formatMonthLabel(revenueMonth)}`;
}

function briefingExcerpt(summary: string | null) {
  if (!summary?.trim()) return 'No preview text available.';
  const flat = summary.replace(/\s+/g, ' ').trim();
  return flat.length > 220 ? `${flat.slice(0, 217)}…` : flat;
}

function confidenceLabel(summary: string | null) {
  const len = summary?.length ?? 0;
  if (len >= 450) return 'High Confidence';
  if (len >= 120) return 'Medium Confidence';
  return 'Medium Confidence';
}

function pageEstimate(summary: string | null) {
  const words = summary?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const pages = Math.max(1, Math.round(words / 220));
  return `${pages} Pages`;
}

export function AiIntelligenceClient({
  availableMonths,
  defaultModel,
  recentBriefings,
  configuredProviders,
}: Props) {
  const router = useRouter();
  const [briefingName, setBriefingName] = useState('');
  const [month, setMonth] = useState(availableMonths[0] ?? '');
  const [model, setModel] = useState(defaultModel in SUPPORTED_MODELS ? defaultModel : 'gpt-4o');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasMonths = availableMonths.length > 0;

  const canUseModel = useMemo(() => {
    const meta = SUPPORTED_MODELS[model];
    if (!meta) return false;
    return configuredProviders.includes(meta.provider);
  }, [model, configuredProviders]);

  function isProviderAvailable(id: string) {
    const meta = SUPPORTED_MODELS[id];
    if (!meta) return false;
    return configuredProviders.includes(meta.provider);
  }

  async function handleGenerate() {
    if (!hasMonths || !canUseModel) return;
    if (!briefingName.trim()) {
      setErrorMsg('Briefing name is required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      if (model !== defaultModel) {
        const patch = await fetch('/api/pipeline/config', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model }),
        });
        if (!patch.ok) {
          const body = await patch.json().catch(() => ({}));
          setErrorMsg(body.error ?? `Could not save model (${patch.status})`);
          return;
        }
      }

      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revenue_month: month, model, briefing_name: briefingName.trim() }),
      });

      if (res.status === 409) {
        router.push(`/dashboard/briefings/${month}`);
        router.refresh();
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? `Error ${res.status}`);
        return;
      }

      router.push(`/dashboard/briefings/${month}`);
      router.refresh();
    } catch {
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  }

  const generateDisabled = !hasMonths || !canUseModel || loading || !briefingName.trim();

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(50vh,28rem)] bg-[radial-gradient(ellipse_at_center_bottom,rgba(139,92,246,0.18),transparent_55%),radial-gradient(ellipse_at_40%_100%,rgba(236,72,153,0.12),transparent_50%)]"
      />

      <div className="relative mx-auto max-w-6xl space-y-10">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">AI Intelligence</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Automated Market Insights
          </p>
        </header>

        <section
          className={cn(
            'rounded-2xl border border-white/10 bg-zinc-900/50 px-4 py-5 shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6 sm:py-6',
            'ring-1 ring-white/[0.06]'
          )}
        >
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="w-full">
              <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-x-4 gap-y-2 sm:gap-x-5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Briefing name
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Target month
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Analysis model
                </label>
                <span aria-hidden className="block text-[10px] font-semibold uppercase tracking-wider text-transparent">
                  Generate
                </span>

                <input
                  type="text"
                  value={briefingName}
                  onChange={(e) => setBriefingName(e.target.value)}
                  placeholder="e.g. Q3 Manhattan Comm"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />

                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    disabled={!hasMonths}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-10 text-sm text-zinc-100 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {!hasMonths && <option value="">No months available</option>}
                    {availableMonths.map((m) => (
                      <option key={m} value={m} className="bg-zinc-900 text-zinc-100">
                        {formatMonthLabel(m)}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 material-symbols-outlined text-[20px]">
                    expand_more
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-10 text-sm text-zinc-100 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  >
                    {MODEL_ENTRIES.map(([id, meta]) => {
                      const available = isProviderAvailable(id);
                      return (
                        <option
                          key={id}
                          value={id}
                          disabled={!available}
                          className="bg-zinc-900 text-zinc-100"
                        >
                          {meta.displayName}
                          {meta.preview ? ' (Preview)' : ''}
                          {!available ? ' — key required' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 material-symbols-outlined text-[20px]">
                    expand_more
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generateDisabled}
                  className={cn(
                    'inline-flex h-[46px] items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-zinc-950',
                    'bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#22d3ee]',
                    'shadow-[0_0_24px_rgba(139,92,246,0.35)] transition hover:opacity-95 active:scale-[0.98]',
                    'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>
                    auto_awesome
                  </span>
                  {loading ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>

          {!canUseModel && (
            <p className="mt-4 text-xs text-amber-200/90">
              Add the required AI provider key in onboarding or settings to use this model.
            </p>
          )}
          {errorMsg && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {errorMsg}
            </p>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Recent Briefings</h2>
            <Link
              href="/dashboard/history"
              className="text-sm font-medium text-cyan-400/90 transition hover:text-cyan-300"
            >
              View Archive →
            </Link>
          </div>

          {recentBriefings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-12 text-center text-sm text-zinc-500">
              No briefings yet. Pick a month and generate your first briefing above.
            </p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {recentBriefings.map((b, i) => {
                const hue = i % 2 === 0 ? 'from-sky-500/25 to-blue-600/10' : 'from-violet-500/25 to-fuchsia-600/10';
                const modelLabel =
                  b.model && SUPPORTED_MODELS[b.model]
                    ? SUPPORTED_MODELS[b.model].displayName
                    : b.model ?? '—';
                return (
                  <li key={b.revenue_month}>
                    <Link
                      href={`/dashboard/briefings/${b.revenue_month}`}
                      className="group block h-full rounded-2xl border border-white/10 bg-zinc-900/40 p-5 shadow-[0px_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-white/15 hover:bg-zinc-900/55"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div
                            className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10',
                              hue
                            )}
                          >
                            <span className="material-symbols-outlined text-[22px] text-white/90">
                              apartment
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-snug text-white group-hover:text-primary">
                              {b.briefing_name?.trim()
                                ? b.briefing_name
                                : briefingTitle(b.portfolio_summary, b.revenue_month)}
                            </h3>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              Generated{' '}
                              {new Date(b.generated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-cyan-400/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/95">
                          Complete
                        </span>
                      </div>

                      <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-400">
                        {briefingExcerpt(b.portfolio_summary)}
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-zinc-500">
                            monitoring
                          </span>
                          {confidenceLabel(b.portfolio_summary)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-zinc-500">
                            description
                          </span>
                          {pageEstimate(b.portfolio_summary)}
                        </span>
                        <span className="ml-auto text-[11px] text-zinc-600">{modelLabel}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
