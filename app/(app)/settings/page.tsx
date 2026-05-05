import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Download,
  ServerCog,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { createAppServerClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Portlio · Settings',
};

type Section = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const SECTIONS: Section[] = [
  {
    title: 'AI Prompt',
    description: 'Customize the system prompt, user template, model and parameters.',
    href: '/settings/prompt',
    icon: Terminal,
    adminOnly: true,
  },
  {
    title: 'Export Data',
    description: 'Download a formatted Excel report of reservations and briefings.',
    href: '/settings/export',
    icon: Download,
  },
  {
    title: 'Connect Supabase',
    description: 'Bring-your-own-Supabase configuration for BYOS workspaces.',
    href: '/admin/connect-supabase',
    icon: ServerCog,
    adminOnly: true,
  },
];

export default async function SettingsPage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userRow?.role ?? 'member';
  const visibleSections = SECTIONS.filter((s) => !s.adminOnly || role === 'admin');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your pipeline configuration and data exports.
        </p>
      </div>

      <div className="space-y-3">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="block">
              <Card className="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-accent/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold leading-tight">
                      {section.title}
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {section.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
