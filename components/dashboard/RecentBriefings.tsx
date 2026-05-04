import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BriefingSummary } from '@/lib/adapters/briefing';

type Props = {
  briefings: BriefingSummary[];
};

export function RecentBriefings({ briefings }: Props) {
  if (briefings.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Recent Briefings</h2>
        <Link href="/archive" className="text-sm font-medium text-primary hover:underline">
          View archive →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.summary}</p>
              )}
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="tabular-nums">{(b.confidence * 100).toFixed(0)}% confidence</span>
                <span>·</span>
                <span>{b.pages} pages</span>
                <span>·</span>
                <span>{b.model}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
