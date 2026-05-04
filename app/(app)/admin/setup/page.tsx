import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { AdminSetupForm } from '@/components/admin/AdminSetupForm';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        <div className="rounded-3xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.45)] p-8">
          <h1 className="text-xl font-semibold text-white/90">Admin already assigned</h1>
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
            This workspace already has an administrator. Ask them to update your permissions if you need admin access.
          </p>
          <div className="mt-6">
            <Link href="/" className={cn(buttonVariants())}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const email = (userRow.email as string) || user.email;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="w-full max-w-xl">
          <div className="rounded-[32px] border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.55)] p-8">
            <h1 className="text-lg font-semibold text-white/90">Initial admin setup</h1>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              You will become the administrator for your company workspace. Please confirm your credentials below to
              establish root access.
            </p>

            <div className="mt-6">
              <AdminSetupForm email={email} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
