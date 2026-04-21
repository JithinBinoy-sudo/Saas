'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Mode = 'hosted' | 'byos';

type Props = {
  selected: Mode | null;
  onSelect: (mode: Mode) => void;
  onBack: () => void;
  onContinue: () => void;
};

type Option = {
  mode: Mode;
  title: string;
  description: string;
  bestFor: string;
  icon: string;
};

const OPTIONS: Option[] = [
  {
    mode: 'hosted',
    title: 'Upload Excel Only',
    description: 'We store your data securely on Portlio. No setup required.',
    bestFor: 'Best for: teams who want to start in minutes.',
    icon: 'upload_file',
  },
  {
    mode: 'byos',
    title: 'Bring Your Supabase',
    description: 'Your data stays in your own Supabase project. Full control.',
    bestFor: 'Best for: teams with strict data residency needs.',
    icon: 'database',
  },
];

export function ModeSelector({ selected, onSelect, onBack, onContinue }: Props) {
  const canContinue = Boolean(selected);
  return (
    <div className="w-full max-w-[760px]">
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
                'ghost-border group relative flex min-h-[170px] flex-col items-start gap-2 rounded-3xl bg-white/5 p-5 text-left backdrop-blur-xl transition',
                'hover:bg-white/7',
                isSelected ? 'ring-1 ring-blue-400/70' : 'ring-1 ring-white/10'
              )}
            >
              <div className="flex w-full items-start justify-between gap-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <span className="material-symbols-outlined text-lg text-white/80">
                    {opt.icon}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full ring-1',
                    isSelected ? 'bg-blue-400 ring-blue-300/70' : 'bg-transparent ring-white/20'
                  )}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black/70" />}
                </span>
              </div>

              <div className="mt-1 space-y-1">
                <div className="text-base font-semibold text-white">{opt.title}</div>
                <div className="text-sm text-white/70">{opt.description}</div>
              </div>

              <div className="mt-auto text-[10px] font-medium uppercase tracking-wide text-white/55">
                {opt.bestFor}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-10 rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className={cn(
            'h-10 rounded-full bg-blue-300 px-6 font-medium text-slate-950 hover:bg-blue-200',
            !canContinue && 'opacity-50 hover:bg-blue-300'
          )}
        >
          Continue to Next Step
        </Button>
      </div>
    </div>
  );
}
