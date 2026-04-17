'use client';

import { useState } from 'react';
import { UploadResultSummary, type UploadResult } from './UploadResultSummary';
import { cn } from '@/lib/utils';

type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; filename: string }
  | { kind: 'success'; result: UploadResult }
  | { kind: 'error'; message: string };

export function UploadDropzone() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setState({ kind: 'uploading', filename: file.name });
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/upload/reservations', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ kind: 'error', message: body.error ?? `HTTP ${res.status}` });
        return;
      }
      const result = (await res.json()) as UploadResult;
      setState({ kind: 'success', result });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'
        )}
      >
        <p className="text-sm font-medium text-slate-700">Drop your Excel file here</p>
        <p className="text-xs text-slate-500">or</p>
        <label className="mt-2 cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Browse files
          <input
            data-testid="upload-file-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">.xlsx or .xls — up to 10,000 rows</p>
      </div>

      {state.kind === 'uploading' && (
        <p className="text-sm text-slate-600">Uploading {state.filename}…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          Upload failed: {state.message}
        </p>
      )}
      {state.kind === 'success' && <UploadResultSummary result={state.result} />}
    </div>
  );
}
