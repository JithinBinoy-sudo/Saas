'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { GlassCard } from './primitives/GlassCard';
import { Stagger, StaggerItem } from './primitives/Motion';

export function FeatureGrid() {
  const { features } = landingCopy;

  return (
    <section id="product" className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {features.title}
          </h2>
        </div>

        <Stagger className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.items.map((f, idx) => (
            <StaggerItem key={f.title}>
              <GlassCard className="h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80">
                    <span className="material-symbols-outlined text-[18px]">
                      {(
                        [
                          'hub',
                          'upload_file',
                          'monitoring',
                          'auto_awesome',
                          'tune',
                          'file_export',
                          'sync',
                          'history',
                        ] as const
                      )[idx] ?? 'bolt'}
                    </span>
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {f.description}
                </p>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

