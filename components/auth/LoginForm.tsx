'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createAppBrowserClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setServerError(null);

    let hasError = false;
    if (!email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const supabase = createAppBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setServerError(error.message);
        return;
      }
      const next = params.get('next');
      const safeNext = next && next.startsWith('/') ? next : null;
      router.push(safeNext ?? '/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative z-10 w-full">
      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-xs font-label text-on-surface-variant font-medium ml-1">Email</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">mail</span>
          </div>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="name@company.com"
            className="w-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface rounded-lg !pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
        </div>
        {emailError && <p className="text-sm text-error ml-1">{emailError}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1 mb-2">
          <label htmlFor="login-password" className="block text-xs font-label text-on-surface-variant font-medium">Password</label>
          <button type="button" className="text-xs text-primary hover:text-secondary transition-colors underline-offset-4 hover:underline">Forgot password?</button>
        </div>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">lock</span>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="w-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface rounded-lg !pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
        </div>
        {passwordError && <p className="text-sm text-error ml-1">{passwordError}</p>}
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
              Logging in…
            </>
          ) : (
            'Log in'
          )}
        </div>
      </button>
    </form>
  );
}
