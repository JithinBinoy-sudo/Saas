import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Briefing · Portlio',
};

export default function BriefingDetailPage({
  params,
}: {
  params: { briefingId: string };
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to overview
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Briefing {params.briefingId}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Briefing detail composition lands in commit 12.
      </p>
    </div>
  );
}
