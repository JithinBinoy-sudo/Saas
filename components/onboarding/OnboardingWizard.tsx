'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from './StepIndicator';
import { ModeSelector } from './ModeSelector';
import { AIKeysStep } from './AIKeysStep';
import { ColumnMappingStep } from './ColumnMappingStep';
import { DeploySchemaStep } from './DeploySchemaStep';
import { OnboardingSignOut } from './OnboardingSignOut';
import type { WizardMode } from '@/lib/onboarding/wizardProgress';

type Mode = WizardMode;

const HOSTED_LABELS = ['Choose Mode', 'AI Provider Keys', 'Column Mapping'];
const BYOS_LABELS = ['Choose Mode', 'AI Provider Keys', 'Column Mapping', 'Deploy Schema'];

function stepTitle(step: number) {
  if (step === 1) return 'Portlio Setup';
  if (step === 2) return 'AI Provider Keys';
  if (step === 3) return 'Column Mapping';
  return 'Deploy Schema';
}

function stepSubtitle(step: number) {
  if (step === 1) {
    return 'Select how you want to manage your data.';
  }
  if (step === 2) return 'Add at least one AI provider key to enable briefings and reports.';
  if (step === 3) {
    return 'Map Excel headers to Portlio fields here. The database still uses fixed column names (e.g. listing_id); on BYOS, redeploy schema if your reservations table predates that.';
  }
  return 'Connect your Supabase project and deploy required tables and views.';
}

async function persistWizardProgress(step: number, mode?: Mode): Promise<boolean> {
  const res = await fetch('/api/onboarding/wizard-progress', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mode ? { step, mode } : { step }),
  });
  return res.ok;
}

type OnboardingWizardProps = {
  initialStep?: number;
  initialMode?: Mode | null;
};

export function OnboardingWizard({
  initialStep = 1,
  initialMode = null,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [stepNavBusy, setStepNavBusy] = useState(false);
  // AI keys are saved individually in AIKeysStep via /api/onboarding/ai-keys

  const { totalSteps, labels } = useMemo(() => {
    if (mode === 'byos') return { totalSteps: 4, labels: BYOS_LABELS };
    return { totalSteps: 3, labels: HOSTED_LABELS };
  }, [mode]);

  const isStepDisabled = useCallback(
    (step: number) => {
      if (step < 1 || step > totalSteps) return true;
      if (step >= 3 && !mode) return true;
      if (step === 4 && mode !== 'byos') return true;
      return false;
    },
    [totalSteps, mode]
  );

  const goToStep = useCallback(
    async (step: number) => {
      if (step === currentStep || stepNavBusy || isStepDisabled(step)) return;
      setStepNavBusy(true);
      try {
        const ok = await persistWizardProgress(step, mode ?? undefined);
        if (ok) {
          setCurrentStep(step);
        }
      } finally {
        setStepNavBusy(false);
      }
    },
    [currentStep, stepNavBusy, isStepDisabled, mode]
  );

  async function handleColumnMappingComplete() {
    if (mode === 'byos') {
      const ok = await persistWizardProgress(4, mode);
      if (ok) setCurrentStep(4);
    } else {
      router.push('/');
    }
  }

  function handleDeployComplete() {
    router.push('/');
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <OnboardingSignOut />
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        labels={labels}
        onStepClick={goToStep}
        isStepDisabled={isStepDisabled}
        stepNavBusy={stepNavBusy}
      />

      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">{stepTitle(currentStep)}</h1>
        <p className="mx-auto mt-2 max-w-[54ch] text-sm text-white/70">
          {stepSubtitle(currentStep)}
        </p>
      </header>

      {currentStep === 1 && (
        <ModeSelector
          selected={mode}
          onSelect={setMode}
          onBack={() => router.push('/auth')}
          onContinue={async () => {
            if (!mode) return;
            const ok = await persistWizardProgress(2, mode);
            if (ok) setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <AIKeysStep
          onBack={async () => {
            const ok = await persistWizardProgress(1, mode ?? undefined);
            if (ok) setCurrentStep(1);
          }}
          onComplete={async () => {
            const ok = await persistWizardProgress(3, mode ?? 'hosted');
            if (ok) setCurrentStep(3);
          }}
        />
      )}

      {currentStep === 3 && mode && (
        <ColumnMappingStep
          mode={mode}
          onBack={async () => {
            const ok = await persistWizardProgress(2, mode);
            if (ok) setCurrentStep(2);
          }}
          onComplete={handleColumnMappingComplete}
        />
      )}

      {currentStep === 4 && mode === 'byos' && (
        <DeploySchemaStep
          onBack={async () => {
            const ok = await persistWizardProgress(3, mode);
            if (ok) setCurrentStep(3);
          }}
          onComplete={handleDeployComplete}
        />
      )}
    </div>
  );
}
