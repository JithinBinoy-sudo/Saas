import { AiSection } from '@/components/landing/AiSection';
import { ConnectedNotes } from '@/components/landing/ConnectedNotes';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { Footer } from '@/components/landing/Footer';
import { Hero } from '@/components/landing/Hero';
import { Integrations } from '@/components/landing/Integrations';
import { MeetingsSection } from '@/components/landing/MeetingsSection';
import { Pricing } from '@/components/landing/Pricing';
import { ResearchReading } from '@/components/landing/ResearchReading';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { Testimonials } from '@/components/landing/Testimonials';
import { TopNav } from '@/components/landing/TopNav';
import { AmbientBackground } from '@/components/landing/visuals/AmbientBackground';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-white antialiased selection:bg-white/10 selection:text-white">
      <TopNav />
      <main className="relative overflow-hidden">
        <AmbientBackground />
        <Hero />
        <div className="mx-auto h-px max-w-6xl bg-white/10" />
        <FeatureGrid />
        <AiSection />
        <ConnectedNotes />
        <ResearchReading />
        <SecuritySection />
        <MeetingsSection />
        <Integrations />
        <Pricing />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
