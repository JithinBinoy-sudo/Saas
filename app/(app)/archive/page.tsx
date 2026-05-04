import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Archive · Portlio',
};

export default function ArchivePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Archive</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All briefings generated for this portfolio.
      </p>

      <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No briefings yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Generate your first executive briefing from the dashboard.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
