import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';

const SECTIONS = [
  {
    title: 'AI Prompt',
    description: 'Customize system prompt, user template, model, and parameters.',
    href: '/dashboard/settings/prompt',
    icon: 'terminal',
    adminOnly: true,
  },
];

export default async function SettingsPage() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  const role = userRow?.role ?? 'member';

  const visibleSections = SECTIONS.filter((s) => !s.adminOnly || role === 'admin');

  return (
    <div className="mx-auto max-w-4xl space-y-12 pt-12 pb-24">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-[15px] text-zinc-400">
          Manage your pipeline configuration and data exports.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        {visibleSections.map((section) => (
          <Link key={section.href} href={section.href} className="block group">
            <div className="flex items-center justify-between rounded-[32px] border border-white/5 bg-[#121214] hover:bg-[#161618] transition-colors px-6 py-6">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#85ADFF] text-xl">
                  {section.icon}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-bold text-white tracking-tight leading-tight">
                    {section.title}
                  </span>
                  <span className="text-[13px] text-zinc-400 tracking-wide">
                    {section.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#85ADFF] opacity-90 group-hover:opacity-100 transition-opacity">
                Open <span aria-hidden>&rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}