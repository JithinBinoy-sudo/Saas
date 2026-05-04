'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

export function AuthTabs() {
  const params = useSearchParams();
  const initial = params.get('tab') === 'signup' ? 'signup' : 'login';
  const [value, setValue] = useState<string>(initial);

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setValue(value === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="w-full">
      <div className="pt-2">
        {value === 'login' ? <LoginForm /> : <SignupForm />}
      </div>
      
      <div className="mt-8 text-center text-xs text-on-surface-variant">
        {value === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              onClick={toggleMode}
              className="text-primary hover:text-white transition-colors border-none bg-transparent"
            >
              Request Access
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={toggleMode}
              className="text-primary hover:text-white transition-colors border-none bg-transparent"
            >
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
