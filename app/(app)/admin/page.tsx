import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import {
  clampWizardStep,
  initialWizardDisplayMode,
  resolveWizardMode,
  type WizardMode,
} from '@/lib/onboarding/wizardProgress';

export const metadata = {
  title: 'Portlio · Admin',
};

export default async function DashboardAdminPage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single();
  if (!userRow || userRow.role !== 'admin') {
    redirect('/admin/setup');
  }

  const { data: companyRow } = await supabase
    .from('companies')
    .select('mode, schema_deployed, onboarding_wizard_step, onboarding_wizard_mode')
    .eq('id', userRow.company_id)
    .single();

  if (companyRow && !companyRow.schema_deployed) {
    const savedStep = Number(companyRow.onboarding_wizard_step) || 1;
    const savedWizardMode = companyRow.onboarding_wizard_mode as WizardMode | null;

    const bootstrapMode = resolveWizardMode(savedWizardMode, savedStep, companyRow.mode);
    const initialStep = clampWizardStep(savedStep, bootstrapMode);
    const initialMode = initialWizardDisplayMode(savedWizardMode, initialStep, companyRow.mode);

    return (
      <div className="mx-auto w-full max-w-3xl">
        <OnboardingWizard initialStep={initialStep} initialMode={initialMode} />
      </div>
    );
  }

  redirect('/settings');
}
