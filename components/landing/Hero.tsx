'use client';

import Link from 'next/link';
import Image from 'next/image';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { FadeIn } from './primitives/Motion';
import { GradientText } from './primitives/GradientText';
import { GlassCard } from './primitives/GlassCard';

function HeroMedia() {
  return (
    <GlassCard hover={false} className="relative overflow-hidden">
      <Image
        alt="Portlio dashboard preview"
        src="/landing/hero.png"
        width={1600}
        height={900}
        priority
        className="h-auto w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(105,218,255,0.16),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(193,128,255,0.16),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(133,173,255,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-950/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-zinc-950/65 to-transparent" />
    </GlassCard>
  );
}

export function Hero() {
  const { hero } = landingCopy;

  return (
    <section className="pt-28 sm:pt-32">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="text-sm font-medium text-white/70">{hero.eyebrow}</p>
          </FadeIn>

          <FadeIn delay={0.06}>
            <h1 className="mt-5 text-balance font-headline text-5xl font-semibold tracking-[-0.02em] text-white sm:text-6xl">
              {hero.titleA}{' '}
              <GradientText>{hero.titleB}</GradientText>
            </h1>
          </FadeIn>

          <FadeIn delay={0.12}>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/65 sm:text-lg">
              {hero.subtitle}
            </p>
          </FadeIn>

          <FadeIn delay={0.18}>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href={hero.primaryCta.href}
                className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-6 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                {hero.primaryCta.label}
              </Link>
              <Link
                href="/auth"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.02] px-6 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.06]"
              >
                Login
              </Link>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.24} y={18} className="mx-auto mt-10 max-w-5xl">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 blur-2xl" />
            <HeroMedia />
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}

