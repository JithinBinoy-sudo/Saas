'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { FadeIn, Stagger, StaggerItem } from './primitives/Motion';

function DeviceMock() {
  return (
    <GlassCard hover={false} className="overflow-hidden p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-20 rounded-full bg-white/10" />
            <div className="h-2.5 w-10 rounded-full bg-white/10" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2.5 w-11/12 rounded-full bg-white/10" />
            <div className="h-2.5 w-10/12 rounded-full bg-white/10" />
            <div className="h-2.5 w-9/12 rounded-full bg-white/10" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="h-28 rounded-xl bg-white/[0.04]" />
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
            <div className="h-2.5 w-24 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function ResearchReading() {
  const { research } = landingCopy;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <FadeIn>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {research.title}
              </h2>
            </FadeIn>
            <FadeIn delay={0.06}>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                {research.subtitle}
              </p>
            </FadeIn>

            <Stagger className="mt-8 space-y-4" stagger={0.06}>
              {research.bullets.map((b) => (
                <StaggerItem key={b.title}>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="text-sm font-semibold text-white/85">{b.title}</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">{b.description}</div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <FadeIn delay={0.08} y={18}>
            <DeviceMock />
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

