'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function ByosSupabaseConnectionCard() {
  const router = useRouter();
  const urlId = useId();
  const keyId = useId();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleTest() {
    setTestMessage(null);
    setSaveMessage(null);
    if (!supabaseUrl.trim() || !serviceKey.trim()) {
      setTestMessage('Enter both URL and service role key to test.');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/connection/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'supabase',
          url: supabaseUrl.trim(),
          service_key: serviceKey.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestMessage('Connection OK — credentials accepted by Supabase.');
      } else {
        setTestMessage(body.error ?? `Test failed (${res.status})`);
      }
    } catch {
      setTestMessage('Network error — try again.');
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setTestMessage(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      const res = await fetch('/api/company/byos-connection', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supabase_url: supabaseUrl.trim(),
          supabase_service_key: serviceKey.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaveMessage('Saved. Run a sync from Data sync below.');
        setServiceKey('');
        router.refresh();
      } else if (body.errors) {
        setSaveMessage('Fix validation errors and try again.');
      } else {
        setSaveMessage(body.error ?? `Save failed (${res.status})`);
      }
    } catch {
      setSaveMessage('Network error — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="byos-supabase">
      <CardHeader>
        <CardTitle>Supabase connection</CardTitle>
        <CardDescription>
          Your project URL and service role key (encrypted at rest). Use the same values as during
          schema deploy, or update them if your project moved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={urlId}>Supabase project URL</Label>
          <input
            id={urlId}
            type="url"
            autoComplete="off"
            placeholder="https://xxxx.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={keyId}>Service role key</Label>
          <input
            id={keyId}
            type="password"
            autoComplete="off"
            placeholder="eyJ… (service_role)"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono',
              'ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save credentials'}
          </Button>
        </div>
        {testMessage && (
          <p
            className={cn(
              'text-sm',
              testMessage.startsWith('Connection OK') ? 'text-green-600' : 'text-destructive'
            )}
          >
            {testMessage}
          </p>
        )}
        {saveMessage && (
          <p
            className={cn(
              'text-sm',
              saveMessage.startsWith('Saved') ? 'text-green-600' : 'text-destructive'
            )}
          >
            {saveMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
