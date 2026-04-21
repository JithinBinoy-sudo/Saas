export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
          <span className="text-sm text-white/75">Loading…</span>
        </div>
      </div>
    </div>
  );
}

