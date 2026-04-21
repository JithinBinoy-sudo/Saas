'use client';

import Link from 'next/link';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { FadeIn, Stagger, StaggerItem } from './primitives/Motion';

export function Pricing() {
  const { pricing } = landingCopy;

  return (
    <section id="pricing" className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {pricing.eyebrow}
            </p>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {pricing.title}
            </h2>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mt-4 text-base leading-relaxed text-white/65">
              {pricing.subtitle}
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.1} y={18} className="mx-auto mt-10 max-w-3xl sm:mt-12">
          <GlassCard className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-4xl font-semibold tracking-tight text-white">
                  {pricing.price}
                  <span className="ml-2 text-base font-medium text-white/55">
                    {pricing.priceSub}
                  </span>
                </div>
              </div>
              <Link
                href={pricing.cta.href}
                className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-6 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                {pricing.cta.label}
              </Link>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <Stagger className="grid gap-3 sm:grid-cols-2" stagger={0.06}>
                {pricing.features.map((f) => (
                  <StaggerItem key={f}>
                    <div className="flex items-start gap-3 text-sm text-white/65">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </span>
                      <span className="leading-relaxed">{f}</span>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </GlassCard>
        </FadeIn>
      </Container>
    </section>
  );
}

