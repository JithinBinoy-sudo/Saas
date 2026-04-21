'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { FadeIn, Stagger, StaggerItem } from './primitives/Motion';

function PromptMock() {
  return (
    <GlassCard hover={false} className="overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <span className="material-symbols-outlined text-[18px]">sparkle</span>
            Ask anything to AI…
          </div>
          <div className="hidden items-center gap-2 text-xs text-white/55 sm:flex">
            <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">Custom</span>
            <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">⌘↩</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-sm text-white/70">
            What can LLMs do, specifically for note-taking?
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              ['Re-run', 'R'],
              ['Insert', 'I'],
              ['Copy', 'C'],
              ['Replace', '⌘↩'],
            ].map(([label, key]) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/70"
              >
                {label}
                <span className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[11px] text-white/60">
                  {key}
                </span>
              </span>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2.5 w-11/12 rounded-full bg-white/10" />
            <div className="h-2.5 w-10/12 rounded-full bg-white/10" />
            <div className="h-2.5 w-9/12 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function AiSection() {
  const { ai } = landingCopy;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <FadeIn>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                {ai.eyebrow}
              </p>
            </FadeIn>
            <FadeIn delay={0.06}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {ai.title}
              </h2>
            </FadeIn>
            <FadeIn delay={0.12}>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                {ai.subtitle}
              </p>
            </FadeIn>

            <FadeIn delay={0.16}>
              <h3 className="mt-10 text-sm font-semibold text-white/80">
                {ai.bulletsTitle}
              </h3>
            </FadeIn>

            <Stagger className="mt-4 space-y-3" stagger={0.06}>
              {ai.bullets.map((b) => (
                <StaggerItem key={b}>
                  <div className="flex items-start gap-3 text-sm text-white/65">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <FadeIn delay={0.1} y={18}>
            <div className="relative">
              <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 blur-2xl" />
              <PromptMock />
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

