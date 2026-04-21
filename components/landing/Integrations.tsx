'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { FadeIn, Stagger, StaggerItem } from './primitives/Motion';

export function Integrations() {
  const { integrations } = landingCopy;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {integrations.eyebrow}
            </p>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {integrations.title}
            </h2>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mt-4 text-base leading-relaxed text-white/65">
              {integrations.subtitle}
            </p>
          </FadeIn>
        </div>

        <Stagger className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {integrations.items.map((i) => (
            <StaggerItem key={i.title}>
              <GlassCard className="h-full p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80">
                  <span className="material-symbols-outlined text-[18px]">widgets</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{i.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{i.description}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

