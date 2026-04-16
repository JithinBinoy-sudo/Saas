import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthTabs } from './AuthTabs';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-sm font-medium tracking-wide text-slate-500">PORTLIO</p>
          <CardTitle className="text-2xl">Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <AuthTabs />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
