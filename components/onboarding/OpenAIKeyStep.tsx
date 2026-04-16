'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  onComplete: (key: string) => void;
};

type Status = 'idle' | 'testing' | 'success' | 'error';

export function OpenAIKeyStep({ onComplete }: Props) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setStatus('testing');
    setError(null);
    try {
      const res = await fetch('/api/connection/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'openai', key }),
      });
      if (res.ok) {
        setStatus('success');
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Connection failed');
      setStatus('error');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setStatus('error');
    }
  }

  function handleKeyChange(value: string) {
    setKey(value);
    // Any edit resets the test result — force re-test.
    if (status !== 'idle') {
      setStatus('idle');
      setError(null);
    }
  }

  const canTest = key.trim().length > 0 && status !== 'testing';
  const canContinue = status === 'success';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="openai-key">OpenAI API Key</Label>
        <Input
          id="openai-key"
          type="password"
          placeholder="sk-..."
          value={key}
          onChange={(e) => handleKeyChange(e.target.value)}
          disabled={status === 'testing'}
        />
      </div>

      <p className="text-xs text-slate-500">
        Your key is stored encrypted and never exposed to the browser after saving.
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={handleTest} disabled={!canTest}>
          {status === 'testing' ? 'Testing…' : 'Test Connection'}
        </Button>
        {status === 'success' && (
          <span className="text-sm font-medium text-green-600">✓ Connection successful</span>
        )}
        {status === 'error' && error && (
          <span className="text-sm font-medium text-destructive">{error}</span>
        )}
      </div>

      <Button type="button" disabled={!canContinue} onClick={() => onComplete(key)}>
        Continue
      </Button>
    </div>
  );
}
