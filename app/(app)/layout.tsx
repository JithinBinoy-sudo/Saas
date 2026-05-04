import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default async function AppLayout({
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
    .select('name, email, role')
    .eq('id', authUser.id)
    .single();

  const user = userRow
    ? {
        name: userRow.name,
        email: userRow.email,
        role: (userRow.role ?? 'member') as 'admin' | 'member',
      }
    : { name: null, email: authUser.email ?? '', role: 'member' as const };

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader user={user} />
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
