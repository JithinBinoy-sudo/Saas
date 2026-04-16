'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

export function AuthTabs() {
  const params = useSearchParams();
  const initial = params.get('tab') === 'signup' ? 'signup' : 'login';
  const [value, setValue] = useState<string>(initial);

  return (
    <Tabs value={value} onValueChange={(v) => setValue(String(v))} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="login">Log in</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="pt-4">
        <LoginForm />
      </TabsContent>
      <TabsContent value="signup" className="pt-4">
        <SignupForm />
      </TabsContent>
    </Tabs>
  );
}
