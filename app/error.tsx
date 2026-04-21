'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred. You can try again or refresh the page.'}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground/80">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
