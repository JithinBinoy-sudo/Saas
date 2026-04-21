'use client';

import { useState, useCallback, useId } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ProviderKey = 'openai' | 'anthropic' | 'google';

type ProviderState = {
  key: string;
  status: 'idle' | 'testing' | 'valid' | 'error';
  error: string | null;
  saved: boolean;
};

const PROVIDERS: {
  id: ProviderKey;
  /** Shown in the pill dropdown */
  selectLabel: string;
  placeholder: string;
  getKeyUrl: string;
}[] = [
  {
    id: 'openai',
    selectLabel: 'OpenAI — GPT-4o family (Recommended)',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    selectLabel: 'Claude (Anthropic)',
    placeholder: 'sk-ant-...',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    selectLabel: 'Gemini (Google AI Studio)',
    placeholder: 'AIza...',
    getKeyUrl: 'https://aistudio.google.com/apikey',
  },
];

const INITIAL_STATE: ProviderState = {
  key: '',
  status: 'idle',
  error: null,
  saved: false,
};

/** Light grey pills — aligned with onboarding glass / zinc surfaces */
const pillSelect =
  'h-12 w-full cursor-pointer appearance-none rounded-full border border-white/[0.14] bg-zinc-600/35 px-4 pr-11 text-sm text-white shadow-none outline-none transition-colors hover:bg-zinc-600/45 focus:border-white/25 focus:bg-zinc-600/40 focus:ring-2 focus:ring-blue-500/25 [&>option]:bg-zinc-800 [&>option]:text-white';

const pillInput =
  'h-12 w-full rounded-full border border-white/[0.14] bg-zinc-600/35 px-4 text-sm text-white shadow-none outline-none transition-colors placeholder:text-white/45 focus:border-white/25 focus:bg-zinc-600/40 focus:ring-2 focus:ring-blue-500/25';

type Props = {
  onBack: () => void | Promise<void>;
  onComplete: (keys: Partial<Record<ProviderKey, string>>) => void | Promise<void>;
};

export function AIKeysStep({ onBack, onComplete }: Props) {
  const selectId = useId();
  const keyInputId = useId();
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>('openai');
  const [showKey, setShowKey] = useState(false);
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

    updateProvider(id, { status: 'testing' });
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

  async function handleContinue() {
    const keys: Partial<Record<ProviderKey, string>> = {};
    for (const p of PROVIDERS) {
      if (providers[p.id].saved) keys[p.id] = providers[p.id].key;
    }
    await onComplete(keys);
  }

  const active = PROVIDERS.find((p) => p.id === selectedProvider)!;
  const state = providers[active.id];
  const canTest = state.key.trim().length > 0 && state.status !== 'testing';
  const canSave = state.status === 'valid' && !state.saved;
  const isBusy = state.status === 'testing';

  return (
    <div className="w-full max-w-[680px]">
      <div
        className={cn(
          'rounded-[28px] border border-white/[0.08] bg-[#161618] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
          'ring-1 ring-white/[0.06]'
        )}
      >
        <div className="flex flex-col gap-8">
          {/* Select provider — mirrors “Select AI Model” block */}
          <div className="flex flex-col gap-2.5">
            <Label htmlFor={selectId} className="text-[15px] font-medium tracking-tight text-white">
              Select AI provider
            </Label>
            <div className="relative">
              <select
                id={selectId}
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value as ProviderKey);
                  setShowKey(false);
                }}
                className={pillSelect}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.selectLabel}
                    {providers[p.id].saved ? ' · saved' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/45"
              />
            </div>
          </div>

          {/* API key — mirrors reference API Key block */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={keyInputId} className="text-[15px] font-medium tracking-tight text-white">
                API Key
              </Label>
              <Link
                href={active.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
              >
                Get key
                <ExternalLink className="size-3.5 shrink-0 opacity-90" aria-hidden />
              </Link>
            </div>

            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-white/35"
                aria-hidden
              />
              <input
                key={active.id}
                id={keyInputId}
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                placeholder={active.placeholder}
                value={state.key}
                onChange={(e) => handleKeyChange(active.id, e.target.value)}
                disabled={isBusy}
                className={cn(pillInput, 'pl-11 pr-12 font-mono text-[13px] tracking-tight')}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/5 hover:text-white/80"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>

            <p className="text-[13px] leading-relaxed text-white/45">
              Your key is encrypted locally and never stored on our servers.
            </p>
          </div>

          {/* Primary actions — Validate + Save Key */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleValidate(active.id)}
                disabled={!canTest}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-colors',
                  'bg-[#2a2a2e] hover:bg-[#34343a]',
                  (!canTest || isBusy) && 'pointer-events-none opacity-45'
                )}
              >
                <ClipboardCheck className="size-[18px] shrink-0 text-white/90" aria-hidden />
                {isBusy ? 'Validating…' : 'Validate'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(active.id)}
                disabled={!canSave || isBusy}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold transition-colors',
                  'bg-[#2a2a2e] text-white hover:bg-[#34343a]',
                  (!canSave || isBusy) && 'pointer-events-none opacity-45'
                )}
              >
                <Save className="size-[18px] shrink-0 text-blue-400" aria-hidden />
                Save Key
              </button>
            </div>

            {state.status === 'valid' && state.saved && (
              <p className="text-center text-sm font-medium text-emerald-400/95">Saved for this provider</p>
            )}
            {state.status === 'valid' && !state.saved && (
              <p className="text-center text-sm font-medium text-emerald-400/95">Valid — save to store</p>
            )}
            {state.status === 'error' && state.error && (
              <p className="text-center text-sm font-medium text-red-300/95">{state.error}</p>
            )}
          </div>

          <p className="border-t border-white/[0.06] pt-6 text-center text-[12px] leading-relaxed text-white/40">
            Add at least one provider key to continue. Keys are encrypted before storage in Portlio.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 rounded-full border-white/10 bg-transparent px-6 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white"
        >
          Back
        </Button>
        <Button
          type="button"
          disabled={!anySaved}
          onClick={handleContinue}
          className={cn(
            'h-11 rounded-full bg-blue-300 px-8 text-sm font-semibold text-slate-950 hover:bg-blue-200',
            !anySaved && 'opacity-45 hover:bg-blue-300'
          )}
        >
          Continue to Next Step
        </Button>
      </div>
    </div>
  );
}
