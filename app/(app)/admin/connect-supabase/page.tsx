import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
import { ConnectSupabaseWizard } from '@/components/admin/ConnectSupabaseWizard';

export const metadata = {
  title: 'Portlio — Connect Supabase',
};

export default async function ConnectSupabasePage() {
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
    .select('mode')
    .eq('id', userRow.company_id)
    .single();

  if (companyRow?.mode === 'byos') {
    redirect('/settings#byos-supabase');
  }

  return <ConnectSupabaseWizard />;
}
