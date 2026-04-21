'use client';

import { cn } from '@/lib/utils';

export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      <div className="absolute -top-40 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-primary/15 blur-[160px]" />
      <div className="absolute top-[12%] -right-40 h-[520px] w-[520px] rounded-full bg-secondary/15 blur-[160px]" />
      <div className="absolute bottom-[-20%] -left-40 h-[520px] w-[520px] rounded-full bg-tertiary/10 blur-[170px]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_10%_50%,rgba(133,173,255,0.06),transparent_50%),radial-gradient(circle_at_90%_60%,rgba(193,128,255,0.06),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.10] mix-blend-soft-light [background-image:radial-gradient(rgba(255,255,255,0.45)_0.5px,transparent_0.5px)] [background-size:24px_24px]" />
    </div>
  );
}

