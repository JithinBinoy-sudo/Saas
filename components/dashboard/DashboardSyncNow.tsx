'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  lastSyncCompletedAt: string | null;
};

type SyncState = 'idle' | 'syncing' | 'error';

function fmtLastSync(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardSyncNow({ lastSyncCompletedAt }: Props) {
  const router = useRouter();
  const [state, setState] = useState<SyncState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncCompletedAt) return null;
    return fmtLastSync(lastSyncCompletedAt);
  }, [lastSyncCompletedAt]);

  async function onSyncNow() {
    setState('syncing');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/sync/reservations', { method: 'POST' });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setErrorMessage('Rate limit reached — max 10 syncs per day.');
        } else {
          setErrorMessage(body.error ?? `Sync failed (${res.status})`);
        }
        setState('error');
        return;
      }

      setState('idle');
      router.refresh();
    } catch {
      setErrorMessage('Network error — try again.');
      setState('error');
    }
  }

  const syncing = state === 'syncing';

  return (
    <div className="relative flex h-[42px] flex-col items-start">
      <Button
        onClick={onSyncNow}
        disabled={syncing}
        variant="ghost"
        className="h-[42px] rounded-full px-6 text-sm font-semibold text-zinc-950 bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#22d3ee] shadow-[0_0_24px_rgba(139,92,246,0.25)] transition hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </Button>
      {errorMessage ? (
        <p className="absolute left-0 top-[calc(100%+6px)] whitespace-nowrap text-xs text-destructive">
          {errorMessage}
        </p>
      ) : lastSyncLabel ? (
        <p className="absolute left-0 top-[calc(100%+6px)] whitespace-nowrap text-xs text-on-surface-variant">
          Last sync: {lastSyncLabel}
        </p>
      ) : null}
    </div>
  );
}

