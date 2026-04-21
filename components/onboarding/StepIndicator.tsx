import { cn } from '@/lib/utils';

type Props = {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  /** When set, steps are buttons so users can jump between stages (saves via parent). */
  onStepClick?: (step: number) => void;
  isStepDisabled?: (step: number) => boolean;
  stepNavBusy?: boolean;
};

type StepState = 'complete' | 'active' | 'pending';

function stateFor(step: number, current: number): StepState {
  if (step < current) return 'complete';
  if (step === current) return 'active';
  return 'pending';
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
  onStepClick,
  isStepDisabled,
  stepNavBusy,
}: Props) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const interactive = Boolean(onStepClick);

  return (
    <div className="w-full max-w-[760px]">
      <div className="flex w-full items-center justify-center">
        <div className="flex items-center justify-center">
          {steps.map((step, idx) => {
            const state = stateFor(step, currentStep);
            const label = labels[idx] ?? '';
            const isLast = idx === steps.length - 1;
            const connectorComplete = step < currentStep;
            const disabled = Boolean(
              (stepNavBusy && step !== currentStep) ||
                (interactive && (isStepDisabled?.(step) ?? false))
            );

            const circle = (
              <div
                data-testid={`step-circle-${step}`}
                data-state={state}
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold tabular-nums leading-none transition-colors',
                  state === 'complete' && 'bg-blue-400 text-black',
                  state === 'active' && 'bg-blue-400 text-black',
                  state === 'pending' && 'bg-white/5 text-white/50 ring-1 ring-white/15',
                  interactive &&
                    !disabled &&
                    'group-hover:bg-blue-300/90 group-hover:text-black group-focus-visible:ring-2 group-focus-visible:ring-blue-200/80',
                  interactive && disabled && 'opacity-45'
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
                  <span className="block leading-none">{step}</span>
                )}
              </div>
            );

            const labelEl = (
              <span
                className={cn(
                  'whitespace-nowrap text-[11px]',
                  state === 'active' ? 'text-white/85' : 'text-white/55',
                  interactive && !disabled && 'group-hover:text-white/90',
                  interactive && disabled && 'opacity-45'
                )}
              >
                {label}
              </span>
            );

            const stepBody = interactive ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onStepClick?.(step)}
                className={cn(
                  'group flex w-[140px] flex-col items-center gap-1 rounded-lg text-center outline-none transition-colors',
                  !disabled && 'cursor-pointer hover:bg-white/[0.04]',
                  disabled && 'cursor-not-allowed'
                )}
                aria-current={step === currentStep ? 'step' : undefined}
              >
                {circle}
                {labelEl}
              </button>
            ) : (
              <div className="flex w-[140px] flex-col items-center gap-1 text-center">
                {circle}
                {labelEl}
              </div>
            );

            return (
              <div key={step} className="flex items-center">
                {stepBody}

                {!isLast && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      'h-px w-24',
                      connectorComplete ? 'bg-blue-400/70' : 'bg-white/10'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
