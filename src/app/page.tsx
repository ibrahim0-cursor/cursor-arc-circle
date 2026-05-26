import { MeshBackground } from "@/components/layout/mesh-background";
import { LandingHero, ProductShowcase } from "@/components/landing/hero";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <MeshBackground variant="home" />
      <div className="relative">
        <LandingHero />
        <ProductShowcase />
        <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-white/40">
          Built for the Agora Agents Hackathon · Circle × Arc ·{" "}
          <a
            className="text-white/70 underline underline-offset-4 hover:text-white"
            href="https://github.com/ibrahim0-cursor/cursor-arc-circle"
          >
            ibrahim0-cursor/cursor-arc-circle
          </a>
        </footer>
      </div>
    </div>
  );
}
