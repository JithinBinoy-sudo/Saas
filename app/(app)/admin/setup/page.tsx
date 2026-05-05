import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { AdminSetupForm } from '@/components/admin/AdminSetupForm';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Portlio · Admin Setup',
};

export default async function AdminSetupPage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect('/auth');

  const admin = createAppAdminClient();
  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('id, company_id, role, email')
    .eq('id', user.id)
    .single();

  if (userErr || !userRow) redirect('/auth');

  if (userRow.role === 'admin') {
    redirect('/admin');
  }

  const companyId = userRow.company_id as string;
  const { count: adminCount } = await admin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('role', 'admin');

  if ((adminCount ?? 0) > 0) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8">
          <h1 className="text-xl font-semibold">Admin already assigned</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            This workspace already has an administrator. Ask them to update your
            permissions if you need admin access.
          </p>
          <div className="mt-6">
            <Link href="/" className={cn(buttonVariants())}>
              Back to dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const email = (userRow.email as string) || user.email;

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="p-8">
        <h1 className="text-lg font-semibold">Initial admin setup</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          You will become the administrator for your company workspace. Please confirm
          your credentials below to establish root access.
        </p>
        <div className="mt-6">
          <AdminSetupForm email={email} />
        </div>
      </Card>
    </div>
  );
}
