import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

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

  const { data: userRow } = await supabase
    .from('users')
    .select('name, email, role, company_id')
    .eq('id', authUser.id)
    .single();

  if (!userRow) {
    redirect('/auth');
  }

  const { data: companyRow } = await supabase
    .from('companies')
    .select('schema_deployed')
    .eq('id', userRow.company_id)
    .single();

  // The onboarding page renders inside this layout too. Don't wrap it in the
  // dashboard chrome — the wizard wants a centered single-column layout.
  // Middleware already gates `/dashboard` vs `/onboarding` based on
  // schema_deployed, so we can rely on that here.
  const isOnboarding = !companyRow?.schema_deployed;

  const user = {
    name: userRow.name,
    email: userRow.email,
    role: (userRow.role ?? 'member') as 'admin' | 'member',
  };

  if (isOnboarding) {
    return <>{children}</>;
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
