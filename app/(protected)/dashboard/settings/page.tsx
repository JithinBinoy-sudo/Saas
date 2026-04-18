import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SECTIONS = [
  {
    title: 'AI Prompt',
    description: 'Customize system prompt, user template, model, and parameters.',
    href: '/dashboard/settings/prompt',
    adminOnly: true,
  },
  {
    title: 'Export Data',
    description: 'Download reservation data as formatted Excel reports.',
    href: '/dashboard/settings/export',
    adminOnly: false,
  },
  {
    title: 'Team',
    description: 'Invite team members and manage roles.',
    href: '/dashboard/settings/team',
    adminOnly: true,
  },
];

export default async function SettingsPage() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userRow?.role ?? 'member';

  const visibleSections = SECTIONS.filter((s) => !s.adminOnly || role === 'admin');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your pipeline configuration and data exports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleSections.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-blue-600 hover:underline">
                  Open &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
