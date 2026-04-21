import Link from 'next/link';

import { landingCopy } from './assets';
import { Container } from './primitives/Container';

export function TopNav() {
  const { nav } = landingCopy;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-white"
        >
          {nav.brand}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={nav.ctas.login.href}
            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            {nav.ctas.login.label}
          </Link>
          <Link
            href={nav.ctas.startTrial.href}
            className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {nav.ctas.startTrial.label}
          </Link>
        </div>
      </Container>
    </nav>
  );
}

