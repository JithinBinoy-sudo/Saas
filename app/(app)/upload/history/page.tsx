import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import { createAppServerClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata = { title: 'Portlio · Upload History' };

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

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

function StatusBadge({ status }: { status: Run['status'] }) {
  if (status === 'complete') {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Completed
      </Badge>
    );
  }
  if (status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }
  if (status === 'running') {
    return (
      <Badge className="border-transparent bg-sky-100 text-sky-800 hover:bg-sky-100">
        Running
      </Badge>
    );
  }
  return <Badge variant="outline">Pending</Badge>;
}

export default async function UploadHistoryPage() {
  const supabase = createAppServerClient();
  const { data: runs } = await supabase
    .from('upload_runs')
    .select(
      'id, filename, total_rows, inserted, failed, status, error_message, started_at, completed_at',
    )
    .order('started_at', { ascending: false })
    .limit(50);

  const rows = (runs ?? []) as Run[];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 50 upload attempts for your company.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No uploads yet. Head to{' '}
            <Link href="/upload" className="font-medium text-primary hover:underline">
              Upload
            </Link>{' '}
            to get started.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-[10px] uppercase tracking-wider text-muted-foreground">
                  File
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Date uploaded
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Rows
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                  Inserted / Failed
                </TableHead>
                <TableHead className="pr-6 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-border">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <span className="truncate text-sm font-medium">{r.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimestamp(r.started_at)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_rows}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="text-emerald-600">{r.inserted}</span> /{' '}
                    <span
                      className={r.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}
                    >
                      {r.failed}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
