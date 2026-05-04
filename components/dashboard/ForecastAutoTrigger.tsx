'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type Props = {
  selectedMonth: string; // 'YYYY-MM-DD'
  hasForecast: boolean;
};

type UiState =
  | { state: 'idle' }
  | { state: 'generating'; message: string }
  | { state: 'error'; message: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TRIES = 20;

export function ForecastAutoTrigger({ selectedMonth, hasForecast }: Props) {
  const router = useRouter();
  const triggerRef = useRef<string>('');
  const pollRef = useRef<number | null>(null);
  const [ui, setUi] = useState<UiState>({ state: 'idle' });

  useEffect(() => {
    if (!selectedMonth || hasForecast) {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setUi({ state: 'idle' });
      return;
    }
    if (triggerRef.current === selectedMonth) return;

    triggerRef.current = selectedMonth;
    const controller = new AbortController();
    setUi({ state: 'generating', message: 'Generating forecast…' });

    const startPolling = () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
      let tries = 0;
      pollRef.current = window.setInterval(() => {
        tries += 1;
        router.refresh();
        if (tries >= MAX_POLL_TRIES) {
          if (pollRef.current != null) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setUi({
            state: 'error',
            message: 'Forecast is taking longer than expected. Try again in a minute.',
          });
        }
      }, POLL_INTERVAL_MS);
    };

    (async () => {
      try {
        const res = await fetch('/api/forecast/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ as_of_month: selectedMonth }),
          signal: controller.signal,
        });

        if (res.status === 202 || res.status === 200) {
          setUi({ state: 'generating', message: 'Forecast is running…' });
          startPolling();
          window.setTimeout(() => router.refresh(), 1500);
          return;
        }
        if (res.status === 409) {
          setUi({ state: 'generating', message: 'Retrying forecast…' });
          window.setTimeout(async () => {
            try {
              const retry = await fetch('/api/forecast/run', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ as_of_month: selectedMonth }),
                signal: controller.signal,
              });
              if (retry.ok || retry.status === 202) {
                startPolling();
              } else {
                setUi({
                  state: 'error',
                  message: `Forecast retry failed (HTTP ${retry.status}).`,
                });
              }
            } catch {
              startPolling();
            }
          }, 1000);
          return;
        }
        if (res.status === 400) {
          const body = await res.json().catch(() => ({}));
          setUi({
            state: 'error',
            message: body?.error ?? 'Not enough data for forecasting this month.',
          });
          return;
        }
        setUi({ state: 'error', message: `Forecast failed (HTTP ${res.status}).` });
      } catch {
        setUi({ state: 'error', message: 'Could not reach the forecast service.' });
      }
    })();

    return () => {
      controller.abort();
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedMonth, hasForecast, router]);

  if (ui.state === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
      {ui.state === 'generating' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : null}
      <span className={ui.state === 'error' ? 'text-destructive' : ''}>{ui.message}</span>
    </div>
  );
}
