'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { createAppBrowserClient } from '@/lib/supabase/browser';

type Props = {
  email: string;
};

export function AdminSetupForm({ email }: Props) {
  const router = useRouter();
  const [keepCurrentPassword, setKeepCurrentPassword] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keepCurrentPassword && (!password || !confirmPassword)) {
      setError(
        'Please enter and confirm your new password, or keep your current sign-in password.',
      );
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string[]>;
      };
      if (!res.ok) {
        if (data.errors) {
          const first = Object.values(data.errors).flat()[0];
          setError(first ?? data.error ?? 'Request failed');
        } else {
          setError(data.error ?? 'Request failed');
        }
        return;
      }
      const supabase = createAppBrowserClient();
      await supabase.auth.signOut();
      router.replace('/auth?tab=login&next=/settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="admin-email">Work email</Label>
        <div className="relative">
          <Input id="admin-email" type="email" value={email} readOnly className="pr-10" />
          <Check
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
            aria-hidden
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <div className="flex items-start gap-3">
          <input
            id="admin-keep-password"
            type="checkbox"
            checked={keepCurrentPassword}
            onChange={(ev) => {
              setKeepCurrentPassword(ev.target.checked);
              setError(null);
            }}
            className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <div className="space-y-1">
            <Label
              htmlFor="admin-keep-password"
              className="cursor-pointer text-sm font-semibold"
            >
              Keep my current sign-in password
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Continue using the credentials provided during your initial enterprise SSO
              onboarding.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-password">New sign-in password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          required={!keepCurrentPassword}
          minLength={8}
          disabled={keepCurrentPassword}
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-confirm">Confirm new password</Label>
        <Input
          id="admin-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(ev) => setConfirmPassword(ev.target.value)}
          required={!keepCurrentPassword}
          minLength={8}
          disabled={keepCurrentPassword}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost' }))}>
          Cancel
        </Link>
        <Button type="submit" disabled={loading} className="gap-1.5">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Register as admin
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
