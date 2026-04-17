type RowError = { row: number; field: string; message: string };

export type UploadResult = {
  filename: string;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: RowError[];
};

type Props = { result: UploadResult };

const VISIBLE = 10;

export function UploadResultSummary({ result }: Props) {
  const allSucceeded = result.failed === 0 && result.inserted === result.total_rows;
  const visibleErrors = result.errors.slice(0, VISIBLE);
  const extra = Math.max(0, result.errors.length - VISIBLE);

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        allSucceeded
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      <p className="font-medium text-slate-900">
        {result.inserted} of {result.total_rows} rows uploaded
        <span className="text-slate-500"> — {result.filename}</span>
      </p>
      {result.errors.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 font-medium text-slate-900">Errors:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
            {visibleErrors.map((e, i) => (
              <li key={i}>
                Row {e.row} — <span className="font-mono text-xs">{e.field}</span>: {e.message}
              </li>
            ))}
          </ul>
          {extra > 0 && (
            <p className="mt-1 text-xs text-slate-500">+ {extra} more errors</p>
          )}
        </div>
      )}
    </div>
  );
}
