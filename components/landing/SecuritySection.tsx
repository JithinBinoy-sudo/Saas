'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { FadeIn } from './primitives/Motion';
import { GlassCard } from './primitives/GlassCard';

function CipherMock() {
  const lines = [
    'LzxlPTvE1PY7bj',
    'UH IAfeSEyPgeU CGZC OlVsOg2GXV2',
    'S1bt3a8Ruw7i8DrdnUovkhLBa3J1jMM',
    'K0oGE6uv 6fHSX6dXE 13yczmqOTMyT1D',
  ];

  return (
    <GlassCard hover={false} className="overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative rounded-2xl border border-white/10 bg-black/30 p-5 font-mono text-xs leading-relaxed text-white/60">
        {lines.map((l) => (
          <div key={l} className="truncate">
            {l}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function SecuritySection() {
  const { security } = landingCopy;

  return (
    <section id="security" className="py-16 sm:py-24">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <FadeIn>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                {security.eyebrow}
              </p>
            </FadeIn>
            <FadeIn delay={0.06}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {security.title}
              </h2>
            </FadeIn>
            <FadeIn delay={0.12}>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                {security.subtitle}
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={0.08} y={18}>
            <div className="relative">
              <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 blur-2xl" />
              <div className="relative">
                <CipherMock />
              </div>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

