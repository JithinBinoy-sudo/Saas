import { createAppServerClient } from '@/lib/supabase/server';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Upload history</h1>
        <p className="mt-1 text-sm text-slate-600">
          Last 50 upload attempts for your company.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No uploads yet. Head to{' '}
          <a className="text-blue-600 hover:underline" href="/dashboard/upload">
            Upload
          </a>{' '}
          to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Rows</th>
                <th className="px-3 py-2 font-medium">Inserted</th>
                <th className="px-3 py-2 font-medium">Failed</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{formatDate(r.started_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.filename}</td>
                  <td className="px-3 py-2 text-slate-700">{r.total_rows}</td>
                  <td className="px-3 py-2 text-emerald-700">{r.inserted}</td>
                  <td className="px-3 py-2 text-amber-700">{r.failed}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.status === 'complete'
                          ? 'inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                          : r.status === 'failed'
                            ? 'inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                            : 'inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700'
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
