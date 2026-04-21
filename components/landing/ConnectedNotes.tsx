'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { FadeIn, Stagger, StaggerItem } from './primitives/Motion';

function GraphMock() {
  return (
    <GlassCard hover={false} className="relative overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(105,218,255,0.22),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(193,128,255,0.20),transparent_60%)]" />
      <div className="relative">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-tertiary/80 shadow-[0_0_14px_rgba(105,218,255,0.55)]" />
                <div className="h-2.5 w-24 rounded-full bg-white/10" />
              </div>
              <div className="mt-3 h-10 rounded-xl bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export function ConnectedNotes() {
  const { connected } = landingCopy;

  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <FadeIn>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {connected.title}
              </h2>
            </FadeIn>
            <FadeIn delay={0.06}>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                {connected.subtitle}
              </p>
            </FadeIn>

            <Stagger className="mt-8 space-y-3" stagger={0.06}>
              {connected.bullets.map((b) => (
                <StaggerItem key={b}>
                  <div className="flex items-start gap-3 text-sm text-white/65">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70">
                      <span className="material-symbols-outlined text-[16px]">north_east</span>
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <FadeIn delay={0.08} y={18}>
            <GraphMock />
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

