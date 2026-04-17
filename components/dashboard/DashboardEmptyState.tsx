import Link from 'next/link';

export function DashboardEmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm text-slate-500">No reservation data yet.</p>
      <Link
        href="/dashboard/upload"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        Upload your first Excel file &rarr;
      </Link>
    </div>
  );
}
