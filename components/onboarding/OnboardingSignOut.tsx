'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAppBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

export function OnboardingSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const supabase = createAppBrowserClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-[760px] justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={handleSignOut}
        disabled={loading}
        className="h-9 rounded-full border-white/10 bg-transparent px-4 text-xs font-medium text-white/80 hover:bg-white/5 hover:text-white"
      >
        {loading ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
