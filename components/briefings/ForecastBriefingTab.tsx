'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  revenueMonth: string;
  currentModel: string;
};

export function ForecastBriefingTab({ revenueMonth, currentModel }: Props) {
  const [loading, setLoading] = useState(false);
  const [forecastBriefing, setForecastBriefing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revenue_month: revenueMonth,
          model: currentModel,
          briefing_name: `Forecast — ${revenueMonth}`,
          forecastMode: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Error ${res.status}`);
        return;
      }

      const result = await res.json();
      setForecastBriefing(result.briefing_text ?? 'Forecast briefing generated. Check the latest briefing.');
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [revenueMonth, currentModel]);

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/10 bg-zinc-900/50 p-6',
        'shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.06]'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px] text-cyan-300"
            aria-hidden
          >
            query_stats
          </span>
          <h2 className="text-sm font-semibold text-white">Predictive Forecast</h2>
        </div>

        {!forecastBriefing && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-zinc-950',
              'bg-gradient-to-r from-cyan-400 to-sky-500',
              'shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:opacity-90 active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'
            )}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              auto_awesome
            </span>
            {loading ? 'Generating…' : 'Generate Forecast Briefing'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {!forecastBriefing && !loading && !error && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-zinc-600" aria-hidden>
            trending_up
          </span>
          <p className="text-sm text-zinc-500 max-w-md">
            Generate a predictive briefing based on ML forecast results. Uses Prophet or ARIMA
            models to project next-month revenue with confidence intervals and property risk scores.
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-6 flex flex-col items-center gap-3 py-10">
          <span className="material-symbols-outlined text-[32px] text-cyan-400 animate-spin">
            sync
          </span>
          <p className="text-sm text-zinc-400">
            Running ML models and generating predictive briefing…
          </p>
        </div>
      )}

      {forecastBriefing && (
        <div className="mt-4 columns-1 gap-10 text-sm leading-relaxed text-zinc-300 md:columns-2">
          <div className="whitespace-pre-wrap break-words">{forecastBriefing}</div>
        </div>
      )}
    </section>
  );
}
