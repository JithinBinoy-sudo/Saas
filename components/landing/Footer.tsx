import Link from 'next/link';

import { Container } from './primitives/Container';
import { landingCopy } from './assets';

export function Footer() {
  const { footer } = landingCopy;

  return (
    <footer className="border-t border-white/10 bg-zinc-950/60 py-12">
      <Container>
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold tracking-tight text-white">Portlio</div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              {footer.newsletter}
            </p>
            <div className="mt-5 flex max-w-md items-center gap-2">
              <input
                aria-label="Email"
                placeholder="Email"
                className="h-11 w-full rounded-full border border-white/10 bg-black/20 px-4 text-sm text-white/85 placeholder:text-white/35 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
                Subscribe
              </button>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Product
            </div>
            <Link className="text-white/60 hover:text-white" href="#product">
              Features
            </Link>
            <Link className="text-white/60 hover:text-white" href="#pricing">
              Pricing
            </Link>
            <Link className="text-white/60 hover:text-white" href="/auth">
              Login
            </Link>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Company
            </div>
            <Link className="text-white/60 hover:text-white" href="#company">
              About
            </Link>
            <Link className="text-white/60 hover:text-white" href="#blog">
              Blog
            </Link>
            <Link className="text-white/60 hover:text-white" href="#changelog">
              Changelog
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Portlio. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link className="hover:text-white" href="#">
              Privacy
            </Link>
            <Link className="hover:text-white" href="#">
              Terms
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

