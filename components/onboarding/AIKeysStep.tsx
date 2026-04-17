'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type ProviderKey = 'openai' | 'anthropic' | 'google';

type ProviderState = {
  key: string;
  status: 'idle' | 'testing' | 'valid' | 'error';
  error: string | null;
  saved: boolean;
};

const PROVIDERS: { id: ProviderKey; label: string; placeholder: string }[] = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Claude', placeholder: 'sk-ant-...' },
  { id: 'google', label: 'Gemini', placeholder: 'AIza...' },
];

const INITIAL_STATE: ProviderState = {
  key: '',
  status: 'idle',
  error: null,
  saved: false,
};

type Props = {
  onComplete: (keys: Partial<Record<ProviderKey, string>>) => void;
};

export function AIKeysStep({ onComplete }: Props) {
  const [providers, setProviders] = useState<Record<ProviderKey, ProviderState>>({
    openai: { ...INITIAL_STATE },
    anthropic: { ...INITIAL_STATE },
    google: { ...INITIAL_STATE },
  });

  const updateProvider = useCallback((id: ProviderKey, patch: Partial<ProviderState>) => {
    setProviders((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  async function handleValidate(id: ProviderKey) {
    const state = providers[id];
    if (!state.key.trim()) return;

    updateProvider(id, { status: 'testing', error: null });

    try {
      const params = new URLSearchParams({ provider: id, key: state.key.trim() });
      const res = await fetch(`/api/ai-keys/validate?${params}`);
      const body = await res.json();

      if (body.valid) {
        updateProvider(id, { status: 'valid' });
      } else {
        updateProvider(id, { status: 'error', error: body.message || 'Validation failed' });
      }
    } catch {
      updateProvider(id, { status: 'error', error: 'Network error' });
    }
  }

  async function handleSave(id: ProviderKey) {
    const state = providers[id];
    if (state.status !== 'valid') return;

    updateProvider(id, { status: 'testing' }); // reuse testing state for save spinner
    try {
      const res = await fetch('/api/onboarding/ai-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: id, key: state.key.trim() }),
      });
      if (res.ok) {
        updateProvider(id, { status: 'valid', saved: true });
      } else {
        const body = await res.json().catch(() => ({}));
        updateProvider(id, { status: 'error', error: body.error ?? 'Failed to save' });
      }
    } catch {
      updateProvider(id, { status: 'error', error: 'Network error' });
    }
  }

  function handleKeyChange(id: ProviderKey, value: string) {
    updateProvider(id, { key: value, status: 'idle', error: null, saved: false });
  }

  const anySaved = Object.values(providers).some((p) => p.saved);

  function handleContinue() {
    const keys: Partial<Record<ProviderKey, string>> = {};
    for (const p of PROVIDERS) {
      if (providers[p.id].saved) keys[p.id] = providers[p.id].key;
    }
    onComplete(keys);
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue={0}>
        <TabsList>
          {PROVIDERS.map((p, i) => (
            <TabsTrigger key={p.id} value={i}>
              {p.label}
              {providers[p.id].saved && <span className="ml-1 text-green-500">✓</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROVIDERS.map((p, i) => {
          const state = providers[p.id];
          const canTest = state.key.trim().length > 0 && state.status !== 'testing';
          const canSave = state.status === 'valid' && !state.saved;

          return (
            <TabsContent key={p.id} value={i}>
              <div className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${p.id}-key`}>{p.label} API Key</Label>
                  <Input
                    id={`${p.id}-key`}
                    type="password"
                    placeholder={p.placeholder}
                    value={state.key}
                    onChange={(e) => handleKeyChange(p.id, e.target.value)}
                    disabled={state.status === 'testing'}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleValidate(p.id)}
                    disabled={!canTest}
                  >
                    {state.status === 'testing' ? 'Validating…' : 'Validate'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSave(p.id)}
                    disabled={!canSave}
                  >
                    Save
                  </Button>

                  {state.status === 'valid' && state.saved && (
                    <span className="text-sm font-medium text-green-600">✓ Saved</span>
                  )}
                  {state.status === 'valid' && !state.saved && (
                    <span className="text-sm font-medium text-green-600">✓ Valid</span>
                  )}
                  {state.status === 'error' && state.error && (
                    <span className="text-sm font-medium text-destructive">{state.error}</span>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <p className="text-xs text-slate-500">
        At least one provider key is required to continue. Keys are encrypted before storage.
      </p>

      <Button type="button" disabled={!anySaved} onClick={handleContinue}>
        Continue
      </Button>
    </div>
  );
}
