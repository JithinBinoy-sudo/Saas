'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';

type Props = {
  count: number;
  active: boolean;
  onToggle: () => void;
};

export function RiskBanner({ count, active, onToggle }: Props) {
  if (count <= 0) return null;
  return (
    <button
      onClick={onToggle}
      className="group flex w-full items-center gap-3 rounded-lg border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-left transition-colors hover:bg-amber-50"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
      </div>
      <div className="text-sm text-foreground">
        <span className="font-semibold">{count} properties</span>{' '}
        <span className="text-muted-foreground">
          are below the yield risk threshold this month.
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1 text-xs font-medium text-primary">
        {active ? 'Showing at-risk only' : 'View at-risk only'}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
