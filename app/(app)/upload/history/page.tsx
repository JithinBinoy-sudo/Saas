import { createAppServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'Portlio — Upload History' };

type Run = {
  id: string;
  filename: string;
  total_rows: number;
  inserted: number;
  failed: number;
  status: 'running' | 'complete' | 'failed';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

function formatMonthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' });
}

function StatusPill({ status }: { status: Run['status'] }) {
  let label = 'Pending';
  let classes = 'border-zinc-400/25 bg-white/5 text-zinc-200';

  if (status === 'complete') {
    label = 'Completed';
    classes = 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200';
  } else if (status === 'failed') {
    label = 'Failed';
    classes = 'border-rose-400/35 bg-rose-400/10 text-rose-200';
  } else if (status === 'running') {
    label = 'Running';
    classes = 'border-sky-400/35 bg-sky-400/10 text-sky-200';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        classes
      )}
    >
      {label}
    </span>
  );
}

export default async function UploadHistoryPage() {
  const supabase = createAppServerClient();
  const { data: runs } = await supabase
    .from('upload_runs')
    .select(
      'id, filename, total_rows, inserted, failed, status, error_message, started_at, completed_at'
    )
    .order('started_at', { ascending: false })
    .limit(50);

  const rows = (runs ?? []) as Run[];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-28 h-[min(55vh,34rem)] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_55%),radial-gradient(ellipse_at_70%_0%,rgba(34,211,238,0.10),transparent_55%)]"
      />

      <div className="relative space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Upload History</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Last 50 upload attempts for your company.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.06]">
          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 border-b border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <div>File</div>
            <div>Date uploaded</div>
            <div>Total Rows</div>
            <div>Inserted / Failed</div>
            <div>Status</div>
          </div>

          {rows.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-zinc-500">
              No uploads yet. Head to{' '}
              <Link href="/upload" className="text-white hover:underline">
                Upload
              </Link>{' '}
              to get started.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {rows.map((r, idx) => {
                const hue = idx % 2 === 0 ? 'from-sky-500/25 to-blue-600/10' : 'from-violet-500/25 to-fuchsia-600/10';

                return (
                  <li key={r.id} className="px-6 py-4">
                    <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10',
                            hue
                          )}
                        >
                          <span className="material-symbols-outlined text-[20px] text-white/90">upload_file</span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{r.filename}</div>
                          <div className="mt-0.5 text-xs text-zinc-500">Data Upload</div>
                        </div>
                      </div>

                      <div className="text-sm text-zinc-400">{formatMonthLabel(r.started_at)}</div>
                      <div className="text-sm text-zinc-400">{r.total_rows}</div>
                      <div className="text-sm text-zinc-400">
                        <span className="text-emerald-400/90">{r.inserted}</span> /{' '}
                        <span className={r.failed > 0 ? 'text-rose-400/90' : 'text-zinc-500'}>{r.failed}</span>
                      </div>
                      <div>
                        <StatusPill status={r.status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}