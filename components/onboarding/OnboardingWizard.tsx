'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from './StepIndicator';
import { ModeSelector } from './ModeSelector';
import { AIKeysStep } from './AIKeysStep';
import { ColumnMappingStep } from './ColumnMappingStep';
import { DeploySchemaStep } from './DeploySchemaStep';

type Mode = 'hosted' | 'byos';

const HOSTED_LABELS = ['Choose Mode', 'AI Provider Keys', 'Column Mapping'];
const BYOS_LABELS = ['Choose Mode', 'AI Provider Keys', 'Column Mapping', 'Deploy Schema'];

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<Mode | null>(null);
  // AI keys are saved individually in AIKeysStep via /api/onboarding/ai-keys

  const { totalSteps, labels } = useMemo(() => {
    if (mode === 'byos') return { totalSteps: 4, labels: BYOS_LABELS };
    return { totalSteps: 3, labels: HOSTED_LABELS };
  }, [mode]);

  function handleKeysComplete() {
    setCurrentStep(3);
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
        <AIKeysStep onComplete={handleKeysComplete} />
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
