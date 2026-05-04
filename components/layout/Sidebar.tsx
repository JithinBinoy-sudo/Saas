'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createAppBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import type { CompanyMode } from './DashboardLayout';

type User = {
  name: string | null;
  email: string;
  role: 'admin' | 'member';
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  /** When set, signed-in members use this href instead of `href` (e.g. Admin → setup). */
  memberHref?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/archive', label: 'AI Intelligence', icon: 'auto_awesome' },
];

const UPLOAD_SUBITEMS: NavItem[] = [
  { href: '/upload', label: 'Upload Data', icon: 'file_upload' },
  { href: '/upload/history', label: 'Upload History', icon: 'history' },
];

const SETTINGS_ITEMS: NavItem[] = [
  {
    href: '/admin',
    memberHref: '/admin/setup',
    label: 'Admin',
    icon: 'admin_panel_settings',
  },
];

const EXPORT_ITEM: NavItem = {
  href: '/settings/export',
  label: 'Export Data',
  icon: 'download',
};

type Props = {
  user: User;
  companyMode: CompanyMode;
  /**
   * True when this workspace already has an admin (may be a different user).
   * Used to hide the "Admin" setup entry for members once it's no longer claimable.
   */
  workspaceHasAdmin?: boolean;
};

export function Sidebar({ user, companyMode, workspaceHasAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const onUploadPath = pathname.startsWith('/upload');
  const [uploadOpen, setUploadOpen] = useState(onUploadPath);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (onUploadPath) setUploadOpen(true);
  }, [onUploadPath]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!accountRef.current) return;
      if (accountRef.current.contains(e.target as Node)) return;
      setAccountOpen(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false);
    }

    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, []);

  async function handleLogout() {
    const supabase = createAppBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth');
  }

  const displayName = useMemo(() => user.name?.trim() || user.email, [user.email, user.name]);
  const roleLabel = user.role === 'admin' ? 'Admin' : 'User';
  const initials = useMemo(() => {
    if (user.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return user.name.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  }, [user.email, user.name]);

  function resolveHref(item: NavItem) {
    if (item.memberHref && user.role !== 'admin') return item.memberHref;
    return item.href;
  }

  function linkActive(href: string) {
    return href === '/'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderItem(item: NavItem) {
    if (item.adminOnly && user.role !== 'admin') return null;
    if (item.href === '/admin') {
      // Once a user has registered as admin, remove the "Admin" nav entry from the sidebar.
      if (user.role === 'admin') return null;
      // If an admin already exists, members can't claim admin anymore; hide the dead-end link.
      if (workspaceHasAdmin) return null;
    }

    const href = resolveHref(item);
    const isActive = linkActive(href);

    return (
      <li key={item.href}>
        <Link
          href={href}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]',
            isActive
              ? 'bg-white/5 text-white ring-1 ring-white/10'
              : 'text-zinc-500 hover:bg-white/5 hover:text-white'
          )}
        >
          <span
            className="material-symbols-outlined"
            style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          {item.label}
        </Link>
      </li>
    );
  }

  const uploadSectionActive = UPLOAD_SUBITEMS.some((item) => linkActive(item.href));

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.4)] flex flex-col p-6 z-50">
      <div className="mb-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-on-primary-fixed font-bold text-lg">
          P
        </div>
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            Portlio
          </h1>
          <p className="text-xs text-on-surface-variant font-medium tracking-wide uppercase">
            PropTech Analytics
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 font-['Inter'] tracking-tight text-sm font-medium flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {renderItem(NAV_ITEMS[0])}
        {companyMode === 'hosted' && (
          <li className="flex flex-col gap-0.5">
            <button
              type="button"
              aria-label="Upload"
              aria-expanded={uploadOpen}
              onClick={() => setUploadOpen((o) => !o)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 active:scale-[0.98]',
                uploadSectionActive
                  ? 'bg-white/5 text-white ring-1 ring-white/10'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white'
              )}
            >
              <span
                aria-hidden
                className="material-symbols-outlined"
                style={
                  uploadSectionActive ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                file_upload
              </span>
              <span className="flex-1">Upload</span>
              <span
                aria-hidden
                className={cn(
                  'material-symbols-outlined text-lg transition-transform duration-200',
                  uploadOpen && 'rotate-180'
                )}
              >
                expand_more
              </span>
            </button>
            {uploadOpen && (
              <ul className="ml-2 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                {UPLOAD_SUBITEMS.map((item) => {
                  const href = item.href;
                  const isActive = linkActive(href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-2 transition-all duration-200 active:scale-[0.98]',
                          isActive
                            ? 'bg-white/5 text-white ring-1 ring-white/10'
                            : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <span
                          aria-hidden
                          className="material-symbols-outlined text-[20px]"
                          style={
                            isActive ? { fontVariationSettings: "'FILL' 1" } : undefined
                          }
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        )}
        {NAV_ITEMS.slice(1).map(renderItem)}
        {renderItem(EXPORT_ITEM)}
        <div className="my-2 h-px bg-white/5" />
        {SETTINGS_ITEMS.map(renderItem)}
      </ul>

      <div className="mt-6 pt-6 border-t border-white/5">
        <div ref={accountRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((o) => !o)}
            className={cn(
              'w-full flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5 text-left transition-all border border-white/5 hover:border-white/10 hover:bg-white/10 active:scale-[0.98]',
              accountOpen && 'ring-1 ring-white/10'
            )}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shadow-[0_0_8px_rgba(133,173,255,0.18)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white/90">{displayName}</div>
              <div className="text-xs text-zinc-500 font-medium">{roleLabel}</div>
            </div>
            <span
              aria-hidden
              className={cn(
                'material-symbols-outlined text-lg text-zinc-500 transition-transform duration-200',
                accountOpen && 'rotate-180'
              )}
            >
              expand_more
            </span>
          </button>

          {accountOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute bottom-[calc(100%+10px)] left-0 w-full rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.55)] p-2"
            >
              <Link
                href="/settings"
                role="menuitem"
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
