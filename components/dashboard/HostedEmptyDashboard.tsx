import Link from 'next/link';

/**
 * Shown when a hosted-mode company has no analytics months yet — Excel is the
 * default path; admins can start BYOS (deploy schema to their Supabase).
 */
export function HostedEmptyDashboard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center gap-6 self-center rounded-xl bg-surface-container/60 p-10 text-center text-on-surface-variant ghost-border shadow-[0px_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <span className="material-symbols-outlined text-5xl text-primary/90">inbox</span>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-on-surface">No dashboard data yet</h2>
        <p className="text-sm leading-relaxed">
          Upload a reservation export to generate portfolio analytics.{' '}
          {isAdmin
            ? 'If you use your own Supabase project instead of Excel, connect it below — Portlio will create the required tables there.'
            : 'Ask an admin to upload data or connect your team’s Supabase project.'}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard/upload"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:opacity-90"
        >
          Upload reservation data
        </Link>
        {isAdmin && (
          <Link
            href="/dashboard/admin/connect-supabase"
            className="inline-flex h-11 items-center justify-center rounded-full border border-outline-variant/40 bg-transparent px-6 text-sm font-medium text-on-surface transition hover:bg-surface-container-high"
          >
            Connect your Supabase
          </Link>
        )}
      </div>
    </div>
  );
}
