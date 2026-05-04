'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createAppBrowserClient } from '@/lib/supabase/browser';

type Props = {
  user: {
    name: string | null;
    email: string;
    role: 'admin' | 'member';
  };
};

function deriveInitials({ name, email }: { name: string | null; email: string }): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+|@/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function DashboardHeader({ user }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createAppBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
            P
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">Portlio</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Proptech Analytics
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                    {deriveInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href={user.role === 'admin' ? '/admin' : '/admin/setup'}>
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/archive">Archive</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/upload">Upload data</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/export">Export data</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Team & permissions</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void handleSignOut();
                }}
                disabled={signingOut}
              >
                {signingOut ? 'Logging out…' : 'Log out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
