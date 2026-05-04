import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { createAppServerClient } from '@/lib/supabase/server';
import {
  clampWizardStep,
  initialWizardDisplayMode,
  resolveWizardMode,
  type WizardMode,
} from '@/lib/onboarding/wizardProgress';

export const metadata = {
  title: 'Portlio — Setup',
};

export default async function OnboardingPage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow?.company_id) {
    redirect('/auth');
  }

  const { data: companyRow, error: companyError } = await supabase
    .from('companies')
    .select('schema_deployed, mode, onboarding_wizard_step, onboarding_wizard_mode')
    .eq('id', userRow.company_id)
    .single();

  if (companyError || !companyRow) {
    redirect('/auth');
  }

  if (companyRow.schema_deployed) {
    redirect('/');
  }

  const savedStep = Number(companyRow.onboarding_wizard_step) || 1;
  const savedWizardMode = companyRow.onboarding_wizard_mode as WizardMode | null;

  const bootstrapMode = resolveWizardMode(savedWizardMode, savedStep, companyRow.mode);
  const initialStep = clampWizardStep(savedStep, bootstrapMode);
  const initialMode = initialWizardDisplayMode(savedWizardMode, initialStep, companyRow.mode);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0d] px-4 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),rgba(0,0,0,0)_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.14),rgba(0,0,0,0)_50%)]"
      />
      <div className="relative w-full max-w-[860px]">
        <OnboardingWizard initialStep={initialStep} initialMode={initialMode} />
      </div>
    </div>
  );
}
