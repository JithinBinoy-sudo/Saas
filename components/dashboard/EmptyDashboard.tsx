import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  mode: 'hosted' | 'byos';
  isAdmin: boolean;
};

export function EmptyDashboard({ mode, isAdmin }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <h2 className="mt-4 text-base font-semibold">No data yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {mode === 'byos'
          ? 'Connect your Supabase project and run a sync to populate the dashboard.'
          : isAdmin
            ? 'Upload your first reservations export to populate the dashboard.'
            : "Your workspace doesn't have any reservations yet. An admin needs to upload data."}
      </p>
      {(mode === 'byos' || isAdmin) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {mode === 'byos' ? (
            <Button asChild>
              <Link href="/settings">Open settings</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/upload">Upload data</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
