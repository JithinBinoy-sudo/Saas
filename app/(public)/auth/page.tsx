import { Suspense } from 'react';
import { AuthTabs } from './AuthTabs';
import Link from 'next/link';

export default function AuthPage() {
  return (
    <>
      {/* TopNavBar Component */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl no-border shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-20">
          <Link href="/" className="text-2xl font-bold text-white tracking-tighter">
            Portlio
          </Link>
          <div className="flex items-center space-x-6">
            <button className="font-inter tracking-tight text-sm font-medium text-primary hover:text-primary transition-colors duration-300 active:opacity-80 transition-all bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/15 relative overflow-hidden">
              <span className="relative z-10">Support</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-24 pb-12 w-full bg-surface">
        {/* Background Ambient Glow (offset slightly to prevent CSS pixel artifact) */}
        <div className="fixed top-[1px] left-[1px] w-[800px] h-[800px] bg-primary/10 flex-shrink-0 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"></div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-surface-container/60 backdrop-blur-[20px] rounded-xl p-10 border border-outline-variant/15 relative shadow-[0px_20px_40px_rgba(0,0,0,0.4)] z-10">
          {/* Ghost Border Highlight */}
          <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none"></div>
          
          {/* Header */}
          <div className="mb-10 text-center relative z-10">
            <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface mb-2">Welcome</h1>
            <p className="text-on-surface-variant text-sm tracking-wide">Enter your details to proceed.</p>
          </div>

          <div className="relative z-10">
            <Suspense fallback={null}>
              <AuthTabs />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex flex-col md:flex-row justify-between items-center px-12 py-10 mt-auto bg-[#0e0e10] z-10 border-t border-outline-variant/10 relative">
        <div className="text-lg font-bold text-white mb-4 md:mb-0">Portlio</div>
        <div className="flex space-x-6 font-inter text-xs tracking-wide uppercase">
          <Link href="#" className="text-[#adaaad] hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="text-[#adaaad] hover:text-white transition-colors">Terms of Service</Link>
          <Link href="#" className="text-[#adaaad] hover:text-white transition-colors">Security</Link>
        </div>
        <div className="font-inter text-xs tracking-wide uppercase text-[#adaaad] mt-4 md:mt-0">
          © 2024 Portlio. Precision in PropTech.
        </div>
      </footer>
    </>
  );
}
