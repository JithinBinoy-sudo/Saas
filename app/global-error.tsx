'use client';

/**
 * Root-level error UI. Must define its own <html> and <body> because it replaces
 * the root layout when an error bubbles up from there.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          background: '#09090b',
          color: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8 }}>Portlio</h1>
        <p style={{ fontSize: '0.875rem', opacity: 0.85, maxWidth: 420, marginBottom: 20 }}>
          {error.message || 'Something went wrong loading the application.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
