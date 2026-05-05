import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { AuthTabs } from './AuthTabs';

export const metadata = {
  title: 'Sign in · Portlio',
};

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              P
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">Portlio</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Proptech Analytics
              </div>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your details to proceed.
            </p>
          </div>
          <Card className="p-6">
            <Suspense fallback={null}>
              <AuthTabs />
            </Suspense>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 Portlio. Precision in PropTech.</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
