'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  briefingText: string;
};

export function UpdatedBriefingDetailClient({ briefingText }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(briefingText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100',
        'transition hover:bg-white/10 active:scale-[0.99]'
      )}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden>
        content_copy
      </span>
      {copied ? 'Copied' : 'Copy to clipboard'}
    </button>
  );
}

