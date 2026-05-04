'use client';

import { useRouter } from 'next/navigation';
import { DeploySchemaStep } from '@/components/onboarding/DeploySchemaStep';

/**
 * Post-onboarding BYOS setup for hosted workspaces (reuses onboarding deploy).
 */
export function ConnectSupabaseWizard() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center overflow-hidden px-4 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),rgba(0,0,0,0)_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.14),rgba(0,0,0,0)_50%)]"
      />
      <div className="relative flex w-full max-w-[900px] flex-col items-center gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Connect your Supabase</h1>
          <p className="mx-auto mt-2 max-w-[54ch] text-sm text-white/70">
            Deploy Portlio tables and views into your Supabase project. After this succeeds, your
            workspace switches to BYOS mode and you can sync reservations from Settings.
          </p>
        </header>
        <DeploySchemaStep
          onBack={() => router.push('/')}
          onComplete={() => {
            router.push('/');
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
