'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import type { AIProviderName } from '@/lib/pipeline/types';

type ButtonState = 'idle' | 'loading' | 'success' | 'upToDate' | 'error';

type Props = {
  currentModel: string;
  revenueMonth: string;
  configuredProviders: AIProviderName[];
};

const MODEL_ENTRIES = Object.entries(SUPPORTED_MODELS);

export function RunPipelineButton({ currentModel, revenueMonth, configuredProviders }: Props) {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(currentModel || 'gpt-4o');
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  async function handleRun() {
    setState('loading');
    setErrorMsg('');

    try {
      // Save model preference if different
      if (selectedModel !== currentModel) {
        await fetch('/api/pipeline/config', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: selectedModel }),
        });
      }

      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revenue_month: revenueMonth, model: selectedModel }),
      });

      if (res.status === 409) {
        setState('upToDate');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? `Error ${res.status}`);
        setState('error');
        return;
      }

      setState('success');
      router.push(`/dashboard/briefings/${revenueMonth}`);
      router.refresh();
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  }

  function isProviderAvailable(provider: AIProviderName) {
    return configuredProviders.includes(provider);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={state === 'loading'}
            className="min-w-[180px] justify-between"
          >
            <span className="flex items-center gap-1.5">
              {SUPPORTED_MODELS[selectedModel]?.displayName ?? selectedModel}
              {SUPPORTED_MODELS[selectedModel]?.preview && (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                  Preview
                </span>
              )}
            </span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {showDropdown && (
            <div className="absolute z-50 mt-1 w-[240px] rounded-md border bg-white py-1 shadow-lg">
              {MODEL_ENTRIES.map(([id, meta]) => {
                const available = isProviderAvailable(meta.provider);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                      available
                        ? 'hover:bg-slate-100 text-slate-900'
                        : 'text-slate-400 cursor-not-allowed'
                    } ${selectedModel === id ? 'bg-slate-50 font-medium' : ''}`}
                    onClick={() => {
                      if (available) {
                        setSelectedModel(id);
                        setShowDropdown(false);
                        setState('idle');
                      }
                    }}
                    disabled={!available}
                  >
                    <span>{meta.displayName}</span>
                    {meta.preview && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                        Preview
                      </span>
                    )}
                    {!available && (
                      <span className="ml-auto text-[10px] text-slate-400">No key</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={handleRun} disabled={state === 'loading'} size="sm">
          {state === 'loading' ? 'Generating…' : 'Generate Briefing'}
        </Button>
      </div>

      {state === 'upToDate' && (
        <p className="text-sm text-amber-600">Briefing is already up to date for this data.</p>
      )}
      {state === 'error' && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
