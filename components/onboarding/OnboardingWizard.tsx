'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from './StepIndicator';
import { ModeSelector } from './ModeSelector';
import { OpenAIKeyStep } from './OpenAIKeyStep';
import { ColumnMappingStep } from './ColumnMappingStep';
import { DeploySchemaStep } from './DeploySchemaStep';

type Mode = 'hosted' | 'byos';

const HOSTED_LABELS = ['Choose Mode', 'OpenAI Key', 'Column Mapping'];
const BYOS_LABELS = ['Choose Mode', 'OpenAI Key', 'Column Mapping', 'Deploy Schema'];

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<Mode | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const { totalSteps, labels } = useMemo(() => {
    if (mode === 'byos') return { totalSteps: 4, labels: BYOS_LABELS };
    return { totalSteps: 3, labels: HOSTED_LABELS };
  }, [mode]);

  async function handleKeyComplete(key: string) {
    setSavingKey(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/onboarding/openai-key', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setKeyError(body.error ?? 'Failed to save OpenAI key');
        return;
      }
      setCurrentStep(3);
    } finally {
      setSavingKey(false);
    }
  }

  function handleColumnMappingComplete() {
    if (mode === 'byos') {
      setCurrentStep(4);
    } else {
      router.push('/dashboard');
    }
  }

  function handleDeployComplete() {
    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={currentStep} totalSteps={totalSteps} labels={labels} />

      {currentStep === 1 && (
        <ModeSelector
          selected={mode}
          onSelect={(m) => {
            setMode(m);
            setCurrentStep(2);
          }}
        />
      )}

      {currentStep === 2 && (
        <div className="flex flex-col gap-3">
          <OpenAIKeyStep onComplete={handleKeyComplete} />
          {savingKey && <p className="text-xs text-slate-500">Saving key…</p>}
          {keyError && (
            <p className="text-sm text-destructive" role="alert">
              {keyError}
            </p>
          )}
        </div>
      )}

      {currentStep === 3 && mode && (
        <ColumnMappingStep mode={mode} onComplete={handleColumnMappingComplete} />
      )}

      {currentStep === 4 && mode === 'byos' && (
        <DeploySchemaStep onComplete={handleDeployComplete} />
      )}
    </div>
  );
}
