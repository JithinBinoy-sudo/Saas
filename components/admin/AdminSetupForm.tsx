'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  email: string;
};

export function AdminSetupForm({ email }: Props) {
  const router = useRouter();
  // Default to preserving the existing credential; changing password should be an explicit opt-in.
  const [keepCurrentPassword, setKeepCurrentPassword] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keepCurrentPassword && (!password || !confirmPassword)) {
      setError('Please enter and confirm your new password, or keep your current sign-in password.');
      return;
    }
    setLoading(true);
    try {
      const body = keepCurrentPassword
        ? { keepCurrentPassword: true }
        : { keepCurrentPassword: false, password, confirmPassword };
      const res = await fetch('/api/admin/initial-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string[]> };
      if (!res.ok) {
        if (data.errors) {
          const first = Object.values(data.errors).flat()[0];
          setError(first ?? data.error ?? 'Request failed');
        } else {
          setError(data.error ?? 'Request failed');
        }
        return;
      }
      router.refresh();
      router.push('/dashboard/admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="admin-email" className="text-xs text-zinc-500">
          Work email
        </Label>
        <div className="relative">
          <span
            aria-hidden
            className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-zinc-500"
          >
            mail
          </span>
          <Input
            id="admin-email"
            type="email"
            value={email}
            readOnly
            className="h-11 rounded-full bg-white/5 border-white/10 text-white/90 pl-11 pr-11 focus-visible:ring-primary/30"
          />
          <span
            aria-hidden
            className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[18px] text-primary"
          >
            check
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-3">
          <input
            id="admin-keep-password"
            type="checkbox"
            checked={keepCurrentPassword}
            onChange={(ev) => {
              setKeepCurrentPassword(ev.target.checked);
              setError(null);
            }}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-primary"
          />
          <div className="space-y-1">
            <Label htmlFor="admin-keep-password" className="cursor-pointer text-sm font-semibold text-white/90">
              Keep my current sign-in password
            </Label>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Continue using the credentials provided during your initial enterprise SSO onboarding.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password" className="text-xs text-zinc-500">
          New sign-in password
        </Label>
        <div className="relative">
          <span
            aria-hidden
            className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-zinc-500"
          >
            lock
          </span>
          <Input
            id="admin-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required={!keepCurrentPassword}
            minLength={8}
            disabled={keepCurrentPassword}
            className={cn(
              'h-11 rounded-full bg-white/5 border-white/10 text-white/90 pl-11 pr-4 focus-visible:ring-primary/30',
              keepCurrentPassword && 'opacity-60'
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-confirm" className="text-xs text-zinc-500">
          Confirm new password
        </Label>
        <div className="relative">
          <span
            aria-hidden
            className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-zinc-500"
          >
            lock_reset
          </span>
          <Input
            id="admin-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(ev) => setConfirmPassword(ev.target.value)}
            required={!keepCurrentPassword}
            minLength={8}
            disabled={keepCurrentPassword}
            className={cn(
              'h-11 rounded-full bg-white/5 border-white/10 text-white/90 pl-11 pr-4 focus-visible:ring-primary/30',
              keepCurrentPassword && 'opacity-60'
            )}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="mt-2 flex items-center justify-between gap-3">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost' }), 'text-zinc-400 hover:text-white')}>
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={loading}
          className="rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary-fixed hover:opacity-95"
        >
          {loading ? 'Saving…' : 'Register as admin'}
          <span className="material-symbols-outlined ml-2 text-[18px]" aria-hidden>
            arrow_forward
          </span>
        </Button>
      </div>
    </form>
  );
}
