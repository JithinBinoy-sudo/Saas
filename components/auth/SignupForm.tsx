'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createAppBrowserClient } from '@/lib/supabase/browser';

type FieldErrors = {
  company_name?: string;
  email?: string;
  password?: string;
};

export function SignupForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!companyName.trim()) next.company_name = 'Company name is required';
    if (!email.trim()) next.email = 'Email is required';
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          email,
          password,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body.error ??
          (body.errors ? 'Please fix the highlighted fields' : 'Sign up failed — please try again');
        setServerError(message);
        return;
      }

      const supabase = createAppBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setServerError(error.message);
        return;
      }
      router.push('/onboarding');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="signup-company">Company name</Label>
        <Input
          id="signup-company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          disabled={loading}
          placeholder="Your Company"
        />
        {errors.company_name && (
          <p className="text-xs text-destructive">{errors.company_name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="name@company.com"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full gap-1.5">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing up…
          </>
        ) : (
          'Sign up'
        )}
      </Button>
    </form>
  );
}
