'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import type { AIProviderName } from '@/lib/pipeline/types';

export type PromptConfig = {
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  updated_at: string | null;
};

const REQUIRED_PLACEHOLDERS = [
  '{{revenue_month}}',
  '{{data}}',
];

const MODEL_ENTRIES = Object.entries(SUPPORTED_MODELS);

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  initialConfig: PromptConfig;
  onConfigChange?: (config: PromptConfig) => void;
};

const DEFAULTS: PromptConfig = {
  system_prompt: `You are a short-term rental portfolio analyst. Given monthly performance data for a vacation rental portfolio, write a concise executive briefing (3–5 paragraphs) that:
1. Summarises portfolio-wide KPIs (revenue, ADR, occupancy) and month-over-month trends.
2. Highlights top-performing and underperforming properties with specific numbers.
3. Identifies actionable insights or risks (seasonality, pricing gaps, channel dependency).
4. Keeps a professional but accessible tone suitable for property managers.`,
  user_prompt_template: `Analyze the following portfolio data for {{revenue_month}}:

{{data}}`,
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 2000,
  updated_at: null,
};

export function PromptConfigForm({ initialConfig, onConfigChange }: Props) {
  const [config, setConfig] = useState<PromptConfig>(initialConfig);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  function update<K extends keyof PromptConfig>(key: K, value: PromptConfig[K]) {
    const next = { ...config, [key]: value };
    setConfig(next);
    onConfigChange?.(next);
    setSaveState('idle');
  }

  const missingPlaceholders = REQUIRED_PLACEHOLDERS.filter(
    (p) => !config.user_prompt_template.includes(p)
  );

  async function handleSave() {
    setSaveState('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/pipeline/prompt', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_prompt: config.system_prompt,
          user_prompt_template: config.user_prompt_template,
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? `Error ${res.status}`);
        setSaveState('error');
        return;
      }

      setSaveState('saved');
    } catch {
      setErrorMsg('Network error');
      setSaveState('error');
    }
  }

  function handleReset() {
    setConfig(DEFAULTS);
    onConfigChange?.(DEFAULTS);
    setSaveState('idle');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* System Prompt */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="system_prompt">System Prompt</Label>
          <span className={`text-xs ${config.system_prompt.length > 4000 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {config.system_prompt.length} / 4000
          </span>
        </div>
        <textarea
          id="system_prompt"
          value={config.system_prompt}
          onChange={(e) => update('system_prompt', e.target.value)}
          rows={8}
          className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* User Prompt Template */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="user_prompt_template">User Prompt Template</Label>
          <span className={`text-xs ${config.user_prompt_template.length > 4000 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {config.user_prompt_template.length} / 4000
          </span>
        </div>
        <textarea
          id="user_prompt_template"
          value={config.user_prompt_template}
          onChange={(e) => update('user_prompt_template', e.target.value)}
          rows={8}
          className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {missingPlaceholders.length > 0 && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Missing placeholders: {missingPlaceholders.map((p) => (
              <code key={p} className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs font-medium">{p}</code>
            ))}
          </div>
        )}
      </div>

      {/* Model Selector */}
      <div className="flex flex-col gap-2">
        <Label>Model</Label>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="min-w-[220px] justify-between"
          >
            <span className="flex items-center gap-1.5">
              {SUPPORTED_MODELS[config.model]?.displayName ?? config.model}
              {SUPPORTED_MODELS[config.model]?.preview && (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">Preview</span>
              )}
            </span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {showModelDropdown && (
            <div className="absolute z-50 mt-1 w-[260px] rounded-md border bg-white py-1 shadow-lg">
              {MODEL_ENTRIES.map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 ${
                    config.model === id ? 'bg-slate-50 font-medium' : ''
                  }`}
                  onClick={() => {
                    update('model', id);
                    setShowModelDropdown(false);
                  }}
                >
                  <span>{meta.displayName}</span>
                  {meta.preview && (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">Preview</span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground capitalize">{meta.provider}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Temperature Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature">Temperature</Label>
          <span className="text-sm font-medium tabular-nums">{config.temperature.toFixed(2)}</span>
        </div>
        <input
          id="temperature"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.temperature}
          onChange={(e) => update('temperature', parseFloat(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Precise (0)</span>
          <span>Creative (1)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="max_tokens">Max Tokens</Label>
        <Input
          id="max_tokens"
          type="number"
          min={100}
          max={4000}
          value={config.max_tokens}
          onChange={(e) => update('max_tokens', parseInt(e.target.value, 10) || 100)}
          className="w-[160px]"
        />
        <p className="text-xs text-muted-foreground">Range: 100 – 4000</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : 'Save changes'}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Reset to defaults
        </button>
        {saveState === 'saved' && (
          <span className="text-sm text-green-600">Saved successfully</span>
        )}
        {saveState === 'error' && errorMsg && (
          <span className="text-sm text-destructive">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
