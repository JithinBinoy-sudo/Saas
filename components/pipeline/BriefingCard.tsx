'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';

type Props = {
  revenueMonth: string;
  briefingText: string;
  generatedAt: string;
  model: string | null;
};

export function BriefingCard({ revenueMonth, briefingText, generatedAt, model }: Props) {
  const [copied, setCopied] = useState(false);

  const modelDisplay = model && SUPPORTED_MODELS[model]
    ? SUPPORTED_MODELS[model].displayName
    : model ?? 'Unknown model';

  async function handleCopy() {
    await navigator.clipboard.writeText(briefingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const date = new Date(generatedAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Portfolio Briefing — {revenueMonth}
          </h2>
          <p className="text-sm text-slate-500">{formattedDate}</p>
        </div>
        <Badge variant="secondary">Generated with {modelDisplay}</Badge>
      </div>

      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
        {briefingText}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </Button>
      </div>
    </div>
  );
}
