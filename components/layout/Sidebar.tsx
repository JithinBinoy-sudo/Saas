'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createAppBrowserClient } from '@/lib/supabase/browser';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type User = {
  name: string | null;
  email: string;
  role: 'admin' | 'member';
};

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/briefings', label: 'Briefings' },
  { href: '/dashboard/properties', label: 'Properties' },
  { href: '/dashboard/reports', label: 'Reports' },
  { href: '/dashboard/upload', label: 'Upload' },
  { href: '/dashboard/upload/history', label: 'Upload History' },
  { href: '/dashboard/history', label: 'History' },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/settings/prompt', label: 'AI Prompt', adminOnly: true },
  { href: '/dashboard/settings/export', label: 'Export Data' },
  { href: '/dashboard/settings/team', label: 'Team', adminOnly: true },
  { href: '/admin', label: 'Admin', adminOnly: true },
];

type Props = {
  user: User;
};

export function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createAppBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth');
  }

  function renderItem(item: NavItem) {
    if (item.adminOnly && user.role !== 'admin') return null;
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'block px-4 py-2 text-sm transition-colors border-l-2',
          isActive
            ? 'border-blue-500 bg-slate-800 text-white'
            : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="px-4 py-5">
        <p className="text-sm font-semibold tracking-wide">PORTLIO</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(renderItem)}
        <div className="my-2 mx-4 h-px bg-slate-700" />
        {SETTINGS_ITEMS.map(renderItem)}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-800 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
            {user.role}
          </Badge>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
