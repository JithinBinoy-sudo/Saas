export type WizardMode = 'hosted' | 'byos';

export function wizardTotalSteps(mode: WizardMode | null): number {
  return mode === 'byos' ? 4 : 3;
}

export function resolveWizardMode(
  savedMode: WizardMode | null | undefined,
  savedStep: number,
  companyMode: string | null | undefined
): WizardMode | null {
  if (savedMode === 'hosted' || savedMode === 'byos') return savedMode;
  if (savedStep >= 4) return 'byos';
  if (companyMode === 'byos') return 'byos';
  return null;
}

export function clampWizardStep(step: number, mode: WizardMode | null): number {
  const max = wizardTotalSteps(mode);
  const s = Number.isFinite(step) ? Math.floor(step) : 1;
  return Math.min(Math.max(s, 1), max);
}

/** Mode shown in the wizard when resuming (step 1 may stay null until the user picks). */
export function initialWizardDisplayMode(
  savedWizardMode: WizardMode | null | undefined,
  step: number,
  companyMode: string | null | undefined
): WizardMode | null {
  if (step <= 1) {
    return savedWizardMode === 'hosted' || savedWizardMode === 'byos' ? savedWizardMode : null;
  }
  return (
    resolveWizardMode(savedWizardMode, step, companyMode) ??
    (step >= 4 ? 'byos' : 'hosted')
  );
}
