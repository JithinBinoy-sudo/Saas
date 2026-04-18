'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

type Props = {
  lastSync: {
    status: string;
    rows_synced: number | null;
    completed_at: string | null;
    started_at: string;
  } | null;
};

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export function SyncCard({ lastSync }: Props) {
  const router = useRouter();
  const [state, setState] = useState<SyncState>('idle');
  const [message, setMessage] = useState('');

  async function handleSync() {
    setState('syncing');
    setMessage('');

    try {
      const res = await fetch('/api/sync/reservations', { method: 'POST' });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setMessage('Rate limit reached — max 10 syncs per day.');
        } else {
          setMessage(body.error ?? `Error ${res.status}`);
        }
        setState('error');
        return;
      }

      setMessage(`Synced ${body.rows_synced ?? 0} rows`);
      setState('success');
      router.refresh();
    } catch {
      setMessage('Network error. Please try again.');
      setState('error');
    }
  }

  const isSyncing = state === 'syncing';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Sync</CardTitle>
        <CardDescription>
          Sync reservation data from your Supabase to Portlio for analytics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {lastSync && lastSync.completed_at ? (
              <p>
                Last synced:{' '}
                {new Date(lastSync.completed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                — {lastSync.rows_synced ?? 0} rows
              </p>
            ) : (
              <p>Never synced</p>
            )}
          </div>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </Button>
        </div>

        {state === 'success' && message && (
          <p className="mt-3 text-sm text-green-600">{message}</p>
        )}
        {state === 'error' && message && (
          <p className="mt-3 text-sm text-destructive">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
