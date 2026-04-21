'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { FadeIn } from './primitives/Motion';
import { Marquee } from './primitives/Marquee';

const testimonials = [
  {
    name: 'Sean Rose',
    handle: '@seanrose',
    quote:
      'Really, really liking Portlio so far. It’s the right amount of fast and does most of the organizing in the background.',
  },
  {
    name: 'Ryan Delk',
    handle: '@delk',
    quote: 'Don’t take it from me: Portlio is magic.',
  },
  {
    name: 'Demetria Giles',
    handle: '@drosewritings',
    quote:
      'So far it’s a knowledge worker’s dream. It makes it easy to capture and recall details from everything I read and hear.',
  },
  {
    name: 'Chris',
    handle: '@mr_chris_l',
    quote:
      'The visualisation is superb and the backlinks make associations effortless. Hats off to the team.',
  },
];

function QuoteCard({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <GlassCard className="w-[320px] shrink-0 p-5">
      <div className="text-sm font-semibold text-white">{t.name}</div>
      <div className="mt-1 text-xs text-white/55">{t.handle}</div>
      <p className="mt-4 text-sm leading-relaxed text-white/65">{t.quote}</p>
    </GlassCard>
  );
}

export function Testimonials() {
  const { testimonials: t } = landingCopy;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              {t.eyebrow}
            </p>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t.title}
            </h2>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mt-4 text-base leading-relaxed text-white/65">
              {t.subtitle}
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.1} y={18} className="mt-10 sm:mt-12">
          <Marquee className="py-2" speedSeconds={28}>
            {testimonials.map((x) => (
              <QuoteCard key={x.handle} t={x} />
            ))}
          </Marquee>
        </FadeIn>
      </Container>
    </section>
  );
}

