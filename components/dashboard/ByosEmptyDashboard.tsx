import Link from 'next/link';
import { ByosSupabaseConnectionCard } from '@/components/settings/ByosSupabaseConnectionCard';

/**
 * Shown when a BYOS company has no analytics months yet — guide them to
 * Supabase settings and sync instead of Excel upload.
 */
export function ByosEmptyDashboard() {
  return (
    <div className="flex w-full flex-col items-stretch gap-8">
      <div className="flex max-w-lg flex-col items-center justify-center gap-6 self-center rounded-xl bg-surface-container/60 p-10 text-center text-on-surface-variant ghost-border shadow-[0px_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <span className="material-symbols-outlined text-5xl text-primary/90">database</span>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-on-surface">Connect your Supabase data</h2>
          <p className="text-sm leading-relaxed">
            Your dashboard pulls from reservation data synced from your Supabase project. Enter your
            project URL and service role key below, then run a sync from Settings if you prefer.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/settings#byos-supabase"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:opacity-90"
          >
            Open in Settings
          </Link>
          <Link
            href="/dashboard/settings#byos-sync"
            className="inline-flex h-11 items-center justify-center rounded-full border border-outline-variant/40 bg-transparent px-6 text-sm font-medium text-on-surface transition hover:bg-surface-container-high"
          >
            Run sync in Settings
          </Link>
        </div>
      </div>

      <div className="w-full text-left">
        <ByosSupabaseConnectionCard />
      </div>
    </div>
  );
}
