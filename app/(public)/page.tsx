import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="bg-surface text-on-surface font-body antialiased selection:bg-primary-container/30 selection:text-primary min-h-screen dark pt-0 pb-0">
      {/* TopNavBar Component */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl no-border shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-20">
          <div className="text-2xl font-bold text-white tracking-tighter">
            Portlio
          </div>
          <div className="hidden md:flex items-center gap-8 font-inter tracking-tight font-medium">
            <Link className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 transition-all duration-300 px-3 py-2 rounded-lg" href="#">Solutions</Link>
            <Link className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 transition-all duration-300 px-3 py-2 rounded-lg" href="#">AI Analytics</Link>
            <Link className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 transition-all duration-300 px-3 py-2 rounded-lg" href="#">Portfolio</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <button className="text-zinc-400 hover:text-white transition-colors font-medium active:scale-95 transition-transform duration-200">
                Sign In
              </button>
            </Link>
            <Link href="/auth?tab=signup">
              <button className="bg-gradient-to-r from-primary to-secondary text-on-primary-fixed font-bold px-5 py-2.5 rounded-full hover:shadow-[0_0_20px_rgba(133,173,255,0.4)] active:scale-95 transition-all duration-200">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-32 pb-24 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary opacity-10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-secondary opacity-10 blur-[150px] rounded-full pointer-events-none"></div>
        
        {/* Section 1: Hero */}
        <section className="relative z-10 max-w-7xl mx-auto px-8 text-center pt-16 pb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high/50 ring-1 ring-outline-variant/20 backdrop-blur-md mb-8">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_rgba(105,218,255,0.8)]"></span>
            <span className="text-sm font-medium text-on-surface-variant">Introducing Obsidian Intelligence Model</span>
          </div>
          <h1 className="font-headline text-display-lg tracking-[-0.02em] font-extrabold text-on-surface max-w-5xl mx-auto mb-6 drop-shadow-2xl">
            Predict the Future of <br/> Property Assets
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed font-body">
            Harness AI-driven portfolio intelligence to uncover hidden yield, forecast market shifts, and command your assets with atmospheric precision.
          </p>
          <div className="flex items-center justify-center gap-4 mb-20">
            <Link href="/auth?tab=signup">
              <button className="bg-gradient-to-r from-primary to-secondary text-on-primary-fixed font-bold px-8 py-4 rounded-full text-lg shadow-[0_0_25px_rgba(133,173,255,0.25)] hover:shadow-[0_0_35px_rgba(133,173,255,0.4)] transition-all duration-300 hover:scale-105 active:scale-95">
                Get Started
              </button>
            </Link>
          </div>
          <div className="relative max-w-5xl mx-auto rounded-xl overflow-hidden ring-1 ring-outline-variant/20 shadow-[0px_30px_60px_rgba(0,0,0,0.6)] group">
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10"></div>
            <div className="relative h-[500px] w-full">
              <Image
                alt="High-end 3D abstract visualization of glowing blue and purple data nodes connecting over a dark, sleek map, depth of field effect"
                className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                data-alt="High-end 3D abstract visualization of glowing blue and purple data nodes connecting like a constellation over a dark, sleek cityscape map, depth of field effect, premium tech aesthetic"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLRD5xK-3QiRXzg7e6TnEiMzIlZ6O4v8YhiKslh7Tfb1yp2ZwVm-gcINxNdeBeEpMSIFxeKhU5YDIV1aLefLWDlGcxsaZhoaAhdGfKi2N-5we6ENBruktm5CnkmeufhXbBGSKZgZzAT50Bec7O_9iw7fcalEbaC0BaXrkyQcABUoREHxXoKqlv2zxpzEVnmMqrC9N7PFsnCtZkGhgkXC67wX4Lx5ZBDxZPh-kKutyx5xRcDldIEg0Ld4e9huDQoAweql-Zu-19U7U"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Value Proposition */}
        <section className="relative z-10 max-w-7xl mx-auto px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container/60 backdrop-blur-[20px] rounded-[2rem] p-8 ring-1 ring-outline-variant/15 relative overflow-hidden group hover:bg-surface-container transition-colors duration-500 shadow-[0px_20px_40px_rgba(0,0,0,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-6 ring-1 ring-outline-variant/30 text-tertiary-container shadow-[0_0_15px_rgba(0,207,252,0.1)]">
                <span className="material-symbols-outlined">auto_graph</span>
              </div>
              <h3 className="text-title-lg font-bold text-on-surface mb-3 tracking-tight">AI Intelligence</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Automated, narrative-driven briefings that synthesize thousands of market data points into actionable institutional strategies.
              </p>
            </div>
            <div className="bg-surface-container/60 backdrop-blur-[20px] rounded-[2rem] p-8 ring-1 ring-outline-variant/15 relative overflow-hidden group hover:bg-surface-container transition-colors duration-500 shadow-[0px_20px_40px_rgba(0,0,0,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-full group-hover:bg-secondary/20 transition-all duration-500"></div>
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-6 ring-1 ring-outline-variant/30 text-secondary shadow-[0_0_15px_rgba(193,128,255,0.1)]">
                <span className="material-symbols-outlined">database</span>
              </div>
              <h3 className="text-title-lg font-bold text-on-surface mb-3 tracking-tight">Unified Data</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Seamless ingest from legacy Excel models and native Supabase architecture. Your entire portfolio, normalized in milliseconds.
              </p>
            </div>
            <div className="bg-surface-container/60 backdrop-blur-[20px] rounded-[2rem] p-8 ring-1 ring-outline-variant/15 relative overflow-hidden group hover:bg-surface-container transition-colors duration-500 shadow-[0px_20px_40px_rgba(0,0,0,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 blur-3xl rounded-full group-hover:bg-tertiary/20 transition-all duration-500"></div>
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-6 ring-1 ring-outline-variant/30 text-primary shadow-[0_0_15px_rgba(133,173,255,0.1)]">
                <span className="material-symbols-outlined">shield_lock</span>
              </div>
              <h3 className="text-title-lg font-bold text-on-surface mb-3 tracking-tight">Institutional Grade</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Built for family offices and REITs. Bank-level encryption, SOC2 compliance, and uncompromising atmospheric execution speed.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Dashboard Preview */}
        <section className="relative z-10 max-w-[90rem] mx-auto px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl font-bold text-on-surface mb-4 tracking-tight">Command Center Aesthetic</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">Interact with your data through a high-fidelity glassmorphic interface designed to surface insights instantly.</p>
          </div>
          <div className="relative rounded-[2rem] p-2 bg-surface-container-low/50 ring-1 ring-outline-variant/20 backdrop-blur-3xl shadow-[0px_40px_80px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-[2rem] pointer-events-none"></div>
            <Image
              alt="Sleek dark mode financial dashboard interface with glowing neon blue and purple line charts"
              className="w-full rounded-[1.5rem] object-cover ring-1 ring-outline-variant/10"
              data-alt="Sleek dark mode PropTech dashboard interface with glowing neon blue line charts, glassmorphic data panels, modern typography, and a dark map visualization"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhulk3dRFiCIzNxsBXFJXY1jX73VoisfR-myxoPFwq4IXe5dXM4MfOHgt1OHmQibzYZKOMThF-GlE6pkHdeTBFu9BaSqBQ7nQ1-BCAw8CqhR60UxUfdIHgcISOJmJY-3XD4gokfHjmzdOSEyg0BRH8-D2FvKuQNSbIXnOYUpiR1cTW1S5uqHKsT-zm36EC7eDuo1oV42Z0me8iECWxyE5PQQvEb-p1UopcMvVjxlDEfkH6c8E-Ong4xPU1i36yAmlg20MWeUEPAao"
              width={1600}
              height={900}
              sizes="(max-width: 1280px) 100vw, 1440px"
            />
          </div>
        </section>

        {/* Section 4: Social Proof */}
        <section className="relative z-10 max-w-7xl mx-auto px-8 py-16 border-t border-outline-variant/10">
          <p className="text-center text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-10">
            Trusted by global real estate leaders
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="font-headline text-2xl font-bold text-on-surface tracking-tighter">AURA CAP</span>
            <span className="font-headline text-2xl font-bold text-on-surface tracking-tighter">NEXUS REIT</span>
            <span className="font-headline text-2xl font-bold text-on-surface tracking-tighter">LUMINA</span>
            <span className="font-headline text-2xl font-bold text-on-surface tracking-tighter">VANTAGE</span>
          </div>
        </section>
      </main>

      {/* Footer Component */}
      <footer className="bg-zinc-950 w-full py-12 border-t border-zinc-800/20 shadow-none">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto px-8 gap-6 text-sm font-inter text-zinc-500">
          <div className="text-xl font-black text-white">
            Portlio
          </div>
          <div className="text-center md:text-left">
            © 2024 Portlio Analytics. Atmospheric Precision in PropTech.
          </div>
          <div className="flex items-center gap-6">
            <Link className="text-zinc-500 hover:text-blue-400 transition-colors" href="#">Terms</Link>
            <Link className="text-zinc-500 hover:text-blue-400 transition-colors" href="#">Privacy</Link>
            <Link className="text-zinc-500 hover:text-blue-400 transition-colors" href="#">Security</Link>
            <Link className="text-zinc-500 hover:text-blue-400 transition-colors" href="#">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
