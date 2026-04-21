'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative z-10 w-full">
      <div className="space-y-2">
        <label htmlFor="signup-company" className="block text-xs font-label text-on-surface-variant font-medium ml-1">Company name</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">business</span>
          </div>
          <input
            id="signup-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
            placeholder="Your Company"
            className="w-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface rounded-lg !pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
        </div>
        {errors.company_name && <p className="text-sm text-error ml-1">{errors.company_name}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-xs font-label text-on-surface-variant font-medium ml-1">Email</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">mail</span>
          </div>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="name@company.com"
            className="w-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface rounded-lg !pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
        </div>
        {errors.email && <p className="text-sm text-error ml-1">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-xs font-label text-on-surface-variant font-medium ml-1">Password</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">lock</span>
          </div>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="w-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface rounded-lg !pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
        </div>
        {errors.password && <p className="text-sm text-error ml-1">{errors.password}</p>}
      </div>

      {serverError && (
        <p className="text-sm text-error ml-1 bg-error-container/20 p-3 rounded-lg border border-error/50" role="alert">
          {serverError}
        </p>
      )}

      <button type="submit" disabled={loading} className="w-full relative group mt-8 disabled:opacity-50">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
        <div className="flex items-center justify-center relative w-full bg-gradient-to-r from-primary to-secondary text-on-primary-fixed font-semibold py-3 rounded-lg text-sm transition-all shadow-[0px_5px_15px_rgba(133,173,255,0.2)]">
          {loading ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
              Signing up…
            </>
          ) : (
            'Sign up'
          )}
        </div>
      </button>
    </form>
  );
}
