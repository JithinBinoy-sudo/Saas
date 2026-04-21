import {
  clampWizardStep,
  initialWizardDisplayMode,
  resolveWizardMode,
  wizardTotalSteps,
} from '../onboarding/wizardProgress';

describe('wizardProgress', () => {
  it('wizardTotalSteps', () => {
    expect(wizardTotalSteps(null)).toBe(3);
    expect(wizardTotalSteps('hosted')).toBe(3);
    expect(wizardTotalSteps('byos')).toBe(4);
  });

  it('resolveWizardMode', () => {
    expect(resolveWizardMode('byos', 2, 'hosted')).toBe('byos');
    expect(resolveWizardMode(null, 4, 'hosted')).toBe('byos');
    expect(resolveWizardMode(null, 2, 'byos')).toBe('byos');
    expect(resolveWizardMode(null, 2, 'hosted')).toBeNull();
  });

  it('clampWizardStep', () => {
    expect(clampWizardStep(99, 'hosted')).toBe(3);
    expect(clampWizardStep(0, 'byos')).toBe(1);
    expect(clampWizardStep(4, 'byos')).toBe(4);
  });

  it('initialWizardDisplayMode', () => {
    expect(initialWizardDisplayMode(null, 1, 'hosted')).toBeNull();
    expect(initialWizardDisplayMode('byos', 1, 'hosted')).toBe('byos');
    expect(initialWizardDisplayMode(null, 3, 'hosted')).toBe('hosted');
    expect(initialWizardDisplayMode(null, 4, 'hosted')).toBe('byos');
  });
});
