'use client';

import { cn } from '@/lib/utils';

type Mode = 'hosted' | 'byos';

type Props = {
  selected: Mode | null;
  onSelect: (mode: Mode) => void;
};

type Option = {
  mode: Mode;
  title: string;
  description: string;
  bestFor: string;
};

const OPTIONS: Option[] = [
  {
    mode: 'hosted',
    title: 'Upload Excel Only',
    description: 'We store your data securely on Portlio. No setup required.',
    bestFor: 'Best for: teams who want to start in minutes.',
  },
  {
    mode: 'byos',
    title: 'Bring Your Supabase',
    description: 'Your data stays in your own Supabase project. Full control.',
    bestFor: 'Best for: teams with strict data residency needs.',
  },
];

export function ModeSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {OPTIONS.map((opt) => {
        const isSelected = selected === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onSelect(opt.mode)}
            data-testid={`mode-card-${opt.mode}`}
            data-selected={isSelected ? 'true' : 'false'}
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition',
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <span className="text-base font-semibold text-slate-900">{opt.title}</span>
            <span className="text-sm text-slate-600">{opt.description}</span>
            <span className="mt-auto text-xs text-slate-500">{opt.bestFor}</span>
          </button>
        );
      })}
    </div>
  );
}
