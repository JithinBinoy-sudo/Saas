import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAppServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/auth');
  }

  // Keep this layout "chrome-less": it only enforces authentication.
  // Dashboard chrome lives in `app/(protected)/dashboard/layout.tsx` so that
  // onboarding never shows the sidebar/top bar.
  return <>{children}</>;
}
