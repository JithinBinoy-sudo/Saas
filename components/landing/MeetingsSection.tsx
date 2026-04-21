'use client';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';
import { FadeIn } from './primitives/Motion';
import { GlassCard } from './primitives/GlassCard';
import { Marquee } from './primitives/Marquee';

function CalendarChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/70">
      <span className="material-symbols-outlined text-[16px] text-white/60">calendar_month</span>
      {label}
    </span>
  );
}

function MeetingRow({ title, time }: { title: string; time: string }) {
  return (
    <div className="flex min-w-[280px] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-sm font-medium text-white/80">{title}</div>
      <div className="text-xs tabular-nums text-white/55">{time}</div>
    </div>
  );
}

export function MeetingsSection() {
  const { meetings } = landingCopy;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <FadeIn>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                {meetings.eyebrow}
              </p>
            </FadeIn>
            <FadeIn delay={0.06}>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {meetings.title}
              </h2>
            </FadeIn>
            <FadeIn delay={0.12}>
              <p className="mt-4 text-base leading-relaxed text-white/65">
                {meetings.subtitle}
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={0.08} y={18}>
            <GlassCard hover={false} className="overflow-hidden p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <CalendarChip label="Google Calendar" />
                <CalendarChip label="Outlook" />
              </div>

              <div className="mt-6">
                <Marquee speedSeconds={22} className="-mx-2 px-2">
                  <MeetingRow title="Meeting with Jonathan at Coffee Brewr" time="5:00am" />
                  <MeetingRow title="Product call with the Design team" time="7:00am" />
                  <MeetingRow title="Team call to figure out what’s next" time="12:00pm" />
                  <MeetingRow title="Weekly review + agenda" time="3:30pm" />
                </Marquee>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/50">Agenda</div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-10/12 rounded-full bg-white/10" />
                    <div className="h-2.5 w-9/12 rounded-full bg-white/10" />
                    <div className="h-2.5 w-7/12 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/50">Takeaways</div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-11/12 rounded-full bg-white/10" />
                    <div className="h-2.5 w-8/12 rounded-full bg-white/10" />
                    <div className="h-2.5 w-10/12 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

