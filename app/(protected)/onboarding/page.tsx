import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export const metadata = {
  title: 'Portlio — Setup',
};

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-[680px]">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium tracking-wide text-slate-500">PORTLIO</p>
          <h1 className="text-2xl font-semibold text-slate-900">Setup</h1>
        </header>
        <OnboardingWizard />
      </div>
    </div>
  );
}
