import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import {
  clampWizardStep,
  initialWizardDisplayMode,
  resolveWizardMode,
  type WizardMode,
} from '@/lib/onboarding/wizardProgress';

export const metadata = {
  title: 'Portlio — Admin',
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
    redirect('/dashboard/admin/setup');
  }

  const { data: companyRow } = await supabase
    .from('companies')
    .select('mode, schema_deployed, onboarding_wizard_step, onboarding_wizard_mode')
    .eq('id', userRow.company_id)
    .single();

  const isHosted = companyRow?.mode !== 'byos';

  if (companyRow && !companyRow.schema_deployed) {
    const savedStep = Number(companyRow.onboarding_wizard_step) || 1;
    const savedWizardMode = companyRow.onboarding_wizard_mode as WizardMode | null;

    const bootstrapMode = resolveWizardMode(savedWizardMode, savedStep, companyRow.mode);
    const initialStep = clampWizardStep(savedStep, bootstrapMode);
    const initialMode = initialWizardDisplayMode(savedWizardMode, initialStep, companyRow.mode);

    return (
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b0d] px-4 py-10 text-white shadow-[0px_20px_40px_rgba(0,0,0,0.45)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),rgba(0,0,0,0)_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.14),rgba(0,0,0,0)_50%)]"
        />
        <div className="relative mx-auto w-full max-w-[860px]">
          <OnboardingWizard initialStep={initialStep} initialMode={initialMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace administration and configuration.
        </p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.45)] p-6">
        <div>
          <h2 className="text-lg font-semibold text-white/90">Configuration</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manage AI prompts, exports, and other admin-only settings from the dashboard.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard/settings/prompt" className={cn(buttonVariants())}>
            AI Prompt
          </Link>
          <Link href="/dashboard/settings/export" className={cn(buttonVariants({ variant: 'outline' }))}>
            Export data
          </Link>
          {isHosted && (
            <Link href="/dashboard/admin/connect-supabase" className={cn(buttonVariants({ variant: 'outline' }))}>
              Connect Supabase (BYOS)
            </Link>
          )}
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }))}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
