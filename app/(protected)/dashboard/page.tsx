import Link from 'next/link';

export const metadata = {
  title: 'Portlio — Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Portfolio Overview</h1>
      </header>

      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-600">
          Upload your first Excel file to see your dashboard.
        </p>
        <Link
          href="/dashboard/upload"
          className="mt-3 text-sm font-medium text-blue-600 hover:underline"
        >
          Go to upload →
        </Link>
      </div>
    </div>
  );
}
