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
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">
            {result.inserted} of {result.total_rows} rows uploaded
            <span className="font-medium text-white/50"> — {result.filename}</span>
          </p>
          <p className="mt-1 text-xs text-white/55">
            {allSucceeded ? 'Upload complete.' : `${result.failed} row(s) need attention.`}
          </p>
        </div>

        <div
          className={
            allSucceeded
              ? 'rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/20'
              : 'rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/20'
          }
        >
          {allSucceeded ? 'Success' : 'Partial'}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-white/75">Errors</p>
          <ul className="space-y-1.5">
            {visibleErrors.map((e, i) => (
              <li
                key={i}
                className="rounded-xl bg-black/30 px-3 py-2 text-xs text-white/75 ring-1 ring-white/10"
              >
                <span className="font-semibold text-white/80">Row {e.row}</span>
                <span className="text-white/50"> — </span>
                <span className="font-mono text-[11px] text-white/70">{e.field}</span>
                <span className="text-white/50">: </span>
                <span className="text-white/75">{e.message}</span>
              </li>
            ))}
          </ul>
          {extra > 0 && (
            <p className="mt-2 text-xs text-white/50">+ {extra} more errors</p>
          )}
        </div>
      )}
    </div>
  );
}
