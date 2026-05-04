'use client';

import { useState } from 'react';
import { UploadResultSummary, type UploadResult } from './UploadResultSummary';
import { cn } from '@/lib/utils';

type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; filename: string }
  | { kind: 'success'; result: UploadResult }
  | { kind: 'error'; message: string };

type Props = {
  redirectOnSuccessTo?: string;
};

export function UploadDropzone({ redirectOnSuccessTo = '/' }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);

  function redirect(to: string) {
    const injected = (globalThis as unknown as { __portlioRedirect?: (url: string) => void })
      .__portlioRedirect;
    if (typeof injected === 'function') {
      injected(to);
      return;
    }
    window.location.assign(to);
  }

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

      if (redirectOnSuccessTo) {
        // Give the user a beat to see the success state, then take them to the dashboard.
        setTimeout(() => {
          redirect(redirectOnSuccessTo);
        }, 650);
      }
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
    <div className="flex flex-col">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/40 px-6 py-10 text-center transition-colors',
          dragging ? 'border-primary/50 bg-black/60' : 'hover:bg-black/50'
        )}
      >
        <div className="mb-4">
          <span className="material-symbols-outlined text-[32px] text-zinc-300">
            note_add
          </span>
        </div>
        <p className="mb-2 text-[15px] font-semibold tracking-wide text-white">
          Drop your Excel file here
        </p>
        <p className="mb-3 text-[12px] font-medium text-zinc-500">or</p>
        
        <label className="cursor-pointer rounded-full bg-gradient-to-r from-[#85ADFF] to-[#D4A5FF] px-7 py-2.5 text-[13px] font-bold tracking-wide text-black transition-transform hover:opacity-90 active:scale-[0.98]">
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
      </div>

      <p className="mt-5 text-center text-[12px] font-medium text-zinc-500">
        .xlsx or .xls — up to 10,000 rows
      </p>

      {state.kind === 'uploading' && (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#85ADFF] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-300">Uploading {state.filename}…</p>
        </div>
      )}
      {state.kind === 'error' && (
        <div className="mt-6 rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/20" role="alert">
          <p className="text-center text-sm font-medium text-rose-400">
            Upload failed: {state.message}
          </p>
        </div>
      )}
      {state.kind === 'success' && (
        <div className="mt-6">
          <UploadResultSummary result={state.result} />
        </div>
      )}
    </div>
  );
}
