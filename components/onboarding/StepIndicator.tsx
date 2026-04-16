import { cn } from '@/lib/utils';

type Props = {
  currentStep: number;
  totalSteps: number;
  labels: string[];
};

type StepState = 'complete' | 'active' | 'pending';

function stateFor(step: number, current: number): StepState {
  if (step < current) return 'complete';
  if (step === current) return 'active';
  return 'pending';
}

export function StepIndicator({ currentStep, totalSteps, labels }: Props) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex w-full items-center">
      {steps.map((step, idx) => {
        const state = stateFor(step, currentStep);
        const label = labels[idx] ?? '';
        const isLast = idx === steps.length - 1;
        const connectorComplete = step < currentStep;

        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                data-testid={`step-circle-${step}`}
                data-state={state}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                  state === 'complete' && 'border-blue-500 bg-blue-500 text-white',
                  state === 'active' && 'border-blue-500 bg-blue-500 text-white',
                  state === 'pending' && 'border-slate-300 bg-white text-slate-400'
                )}
              >
                {state === 'complete' ? (
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className="whitespace-nowrap text-xs text-slate-600">{label}</span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'mx-2 h-px flex-1',
                  connectorComplete ? 'bg-blue-500' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
