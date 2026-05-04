import { createAppServerClient } from '@/lib/supabase/server';
import { LandingPage } from '@/components/landing/LandingPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';

export const metadata = {
  title: 'Portlio · Proptech Analytics',
};

export default async function RootPage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  return <DashboardPage userId={user.id} />;
}
