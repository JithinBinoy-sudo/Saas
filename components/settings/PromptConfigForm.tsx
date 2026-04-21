'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_TEMPLATE } from '@/lib/pipeline/defaultPrompts';


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
  testPanel?: React.ReactNode;
};

const DEFAULTS: PromptConfig = {
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  user_prompt_template: DEFAULT_USER_TEMPLATE,
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 2000,
  updated_at: null,
};

export function PromptConfigForm({ initialConfig, onConfigChange, testPanel }: Props) {
  const [config, setConfig] = useState<PromptConfig>(initialConfig);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const activeModelMeta = useMemo(() => SUPPORTED_MODELS[config.model], [config.model]);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);

  function update<K extends keyof PromptConfig>(key: K, value: PromptConfig[K]) {
    const next = { ...config, [key]: value };
    setConfig(next);
    onConfigChange?.(next);
    setSaveState('idle');
  }

  useEffect(() => {
    if (!showModelDropdown) return;

    function onDocPointerDown(e: PointerEvent) {
      if (!modelPickerRef.current) return;
      if (modelPickerRef.current.contains(e.target as Node)) return;
      setShowModelDropdown(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModelDropdown(false);
    }

    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [showModelDropdown]);

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
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <Card className="ghost-border overflow-visible rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader className="px-6 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary/80" aria-hidden>
                    psychology
                  </span>
                  <CardTitle className="text-base text-white">System Prompt</CardTitle>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  Defines the AI&apos;s persona and core operational rules.
                </p>
              </div>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  config.system_prompt.length > 4000 ? 'text-destructive font-medium' : 'text-white/60'
                )}
              >
                {config.system_prompt.length} / 4000
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Label htmlFor="system_prompt" className="sr-only">
              System Prompt
            </Label>
            <textarea
              id="system_prompt"
              value={config.system_prompt}
              onChange={(e) => update('system_prompt', e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white/85 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </CardContent>
        </Card>

        <Card className="ghost-border overflow-visible rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader className="px-6 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary/80" aria-hidden>
                    code_blocks
                  </span>
                  <CardTitle className="text-base text-white">User Prompt Template</CardTitle>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  The dynamic query sent with each generation. Use {'{{variables}}'}.
                </p>
              </div>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  config.user_prompt_template.length > 4000
                    ? 'text-destructive font-medium'
                    : 'text-white/60'
                )}
              >
                {config.user_prompt_template.length} / 4000
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            <Label htmlFor="user_prompt_template" className="sr-only">
              User Prompt Template
            </Label>
            <textarea
              id="user_prompt_template"
              value={config.user_prompt_template}
              onChange={(e) => update('user_prompt_template', e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white/85 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {missingPlaceholders.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Missing placeholders:
                {missingPlaceholders.map((p) => (
                  <code
                    key={p}
                    className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs font-medium text-amber-900"
                  >
                    {p}
                  </code>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {testPanel}

        {saveState === 'saved' && (
          <p className="text-sm text-green-600">Saved successfully</p>
        )}
        {saveState === 'error' && errorMsg && (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}
      </div>

      <div className="lg:sticky lg:top-20 h-fit">
        <Card className="ghost-border overflow-visible rounded-3xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader className="px-6 pt-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary/80" aria-hidden>
                tune
              </span>
              <CardTitle className="text-base text-white">Generation Parameters</CardTitle>
            </div>
            <p className="mt-1 text-xs text-white/60">
              Model and sampling parameters used for generation.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <div className="space-y-2">
              <Label className="text-white">Model</Label>
              <div className="relative" ref={modelPickerRef}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="w-full justify-between rounded-xl border-white/10 bg-black/20 text-white/85 hover:bg-white/5"
                >
                  <span className="flex items-center gap-1.5">
                    {activeModelMeta?.displayName ?? config.model}
                    {activeModelMeta?.preview && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                        Preview
                      </span>
                    )}
                  </span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

                {showModelDropdown && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 py-1 shadow-[0px_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                    {MODEL_ENTRIES.map(([id, meta]) => (
                      <button
                        key={id}
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/5',
                          config.model === id && 'bg-white/5 font-medium'
                        )}
                        onClick={() => {
                          update('model', id);
                          setShowModelDropdown(false);
                        }}
                      >
                        <span>{meta.displayName}</span>
                        {meta.preview && (
                          <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                            Preview
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground capitalize">{meta.provider}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature" className="text-white">
                  Temperature
                </Label>
                <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-xs font-medium tabular-nums text-white/85">
                  {config.temperature.toFixed(2)}
                </span>
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
              <div className="flex justify-between text-xs text-white/60">
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_tokens" className="text-white">
                Max Tokens
              </Label>
              <Input
                id="max_tokens"
                type="number"
                min={100}
                max={4000}
                value={config.max_tokens}
                onChange={(e) => update('max_tokens', parseInt(e.target.value, 10) || 100)}
                className="w-full rounded-xl border-white/10 bg-black/20 text-white/85"
              />
              <p className="text-xs text-white/60">Range: 100 – 4000</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-6 text-sm font-medium text-[#90B5FF] hover:bg-white/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            history
          </span>
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#90B5FF] to-[#D5A0FF] px-6 text-sm font-medium text-black hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saveState === 'saving' ? (
            'Saving…'
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="8" fill="black"/>
                <path d="M5 8L7.5 10.5L11.5 6" stroke="#90B5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Save changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
