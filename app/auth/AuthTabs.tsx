'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

export function AuthTabs() {
  const params = useSearchParams();
  const initial = params.get('tab') === 'signup' ? 'signup' : 'login';
  const [value, setValue] = useState<'login' | 'signup'>(initial);

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setValue(value === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="w-full">
      {value === 'login' ? <LoginForm /> : <SignupForm />}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        {value === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              onClick={toggleMode}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={toggleMode}
              className="font-medium text-primary hover:underline"
            >
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
