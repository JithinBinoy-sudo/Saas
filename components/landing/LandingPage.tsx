import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Portfolio analytics',
    body: 'Real-time revenue, ADR, occupancy and yield metrics across every listing — surfaced exactly where you need them.',
  },
  {
    icon: TrendingUp,
    title: 'Forecasting',
    body: 'Month-ahead revenue projections with 90% confidence intervals, computed automatically from your booking history.',
  },
  {
    icon: FileText,
    title: 'AI executive briefings',
    body: 'One-click monthly summaries with critical-property callouts, channel mix, and recommended actions — delivered as PDF.',
  },
];

const SECTIONS = [
  {
    title: 'Built for portfolio analysts',
    body: 'Portlio aggregates booking data across Airbnb, Booking.com and direct channels, surfaces at-risk properties, and gives you the narrative you need to share with clients.',
    cta: { label: 'See how it works', href: '/auth?tab=signup' },
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild className="h-9">
              <Link href="/auth">Log in</Link>
            </Button>
            <Button asChild className="h-9 gap-1.5">
              <Link href="/auth?tab=signup">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered briefings, every month
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Portfolio intelligence for short-term rental operators.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Portlio turns your reservations data into clear performance metrics,
              forecasts, and executive briefings — so you can spend less time in
              spreadsheets and more time talking to owners.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-1.5">
                <Link href="/auth?tab=signup">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.title} className="border-t border-border bg-muted/30">
            <div className="container mx-auto flex flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {s.body}
                </p>
              </div>
              <Button asChild size="lg" variant="outline" className="gap-1.5">
                <Link href={s.cta.href}>
                  {s.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        ))}

        <section className="container mx-auto px-6 py-20">
          <Card className="p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              Your data, your workspace
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Portlio is row-level secure by default. Bring your own Supabase project for
              full data isolation, or run on our managed instance for zero setup.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" className="gap-1.5">
                <Link href="/auth?tab=signup">
                  Create your workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border py-8">
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
