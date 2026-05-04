import Link from 'next/link';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createAppServerClient } from '@/lib/supabase/server';
import {
  toBriefingSummaries,
  type BriefingDbRow,
} from '@/lib/adapters/briefing';

export const metadata = {
  title: 'Archive · Portlio',
};

export default async function ArchivePage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (!userRow) return null;

  const { data: rows } = await supabase
    .from('monthly_portfolio_briefings')
    .select('revenue_month, portfolio_summary, generated_at, model, briefing_name')
    .eq('company_id', userRow.company_id)
    .order('generated_at', { ascending: false });

  const briefings = toBriefingSummaries((rows ?? []) as BriefingDbRow[]);

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

      {briefings.length === 0 ? (
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
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          {briefings.map((b) => (
            <Link key={b.id} href={`/briefing/${b.id}`}>
              <Card className="cursor-pointer p-4 transition-colors hover:bg-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {b.title}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Generated {b.date}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {b.status}
                  </Badge>
                </div>
                {b.summary && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {b.summary}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">
                    {(b.confidence * 100).toFixed(0)}% confidence
                  </span>
                  <span>·</span>
                  <span>{b.pages} pages</span>
                  <span>·</span>
                  <span>{b.model}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
