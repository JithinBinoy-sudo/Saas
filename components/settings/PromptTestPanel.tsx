'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Per-1K-token pricing (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':                        { input: 0.0025, output: 0.01 },
  'gpt-4o-mini':                   { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet-20241022':    { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307':       { input: 0.00025, output: 0.00125 },
  'gemini-2.5-flash':              { input: 0.00015, output: 0.0006 },
  'gemini-2.5-flash-lite':         { input: 0.0000375, output: 0.00015 },
  'gemini-3-flash-preview':        { input: 0.0004, output: 0.0016 },
  'gemini-3.1-flash-lite-preview': { input: 0.0001, output: 0.0004 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): string | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  const cost = (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
  return `~$${cost.toFixed(4)}`;
}

type TestResult = {
  briefing_text: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
};

type TestState = 'idle' | 'loading' | 'done' | 'error';

type Props = {
  model: string;
  availableMonths: string[];
};

export function PromptTestPanel({ model, availableMonths }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] ?? '');
  const [state, setState] = useState<TestState>('idle');
  const [result, setResult] = useState<TestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  async function handleTest() {
    if (!selectedMonth) return;
    setState('loading');
    setErrorMsg('');
    setResult(null);

    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revenue_month: selectedMonth,
          model,
          preview: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error ?? `Error ${res.status}`);
        setState('error');
        return;
      }

      const data: TestResult = await res.json();
      setResult(data);
      setState('done');
      setCollapsed(false);
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">Test Prompt</h3>
      <p className="text-xs text-muted-foreground">
        Run a test with the current prompt settings. No briefing will be saved.
      </p>

      <div className="flex items-center gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
          disabled={availableMonths.length === 0}
        >
          {availableMonths.length === 0 && <option value="">No data available</option>}
          {availableMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <Button
          size="sm"
          variant="outline"
          onClick={handleTest}
          disabled={state === 'loading' || !selectedMonth}
        >
          {state === 'loading' ? (
            <span className="flex items-center gap-1">
              Running
              <span className="animate-pulse">...</span>
            </span>
          ) : (
            'Test prompt'
          )}
        </Button>
      </div>

      {state === 'error' && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      {result && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Test Result</CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {result.prompt_tokens + result.completion_tokens} tokens
                  ({result.prompt_tokens} in / {result.completion_tokens} out)
                </span>
                {estimateCost(result.model, result.prompt_tokens, result.completion_tokens) && (
                  <span className="text-muted-foreground">
                    {estimateCost(result.model, result.prompt_tokens, result.completion_tokens)}
                  </span>
                )}
                <span className="text-[10px]">{collapsed ? '▼' : '▲'}</span>
              </div>
            </div>
          </CardHeader>
          {!collapsed && (
            <CardContent>
              <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
                {result.briefing_text}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                This is a test run. No briefing was saved.
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
