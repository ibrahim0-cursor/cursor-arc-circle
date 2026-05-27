import { ArcBackground } from "@/components/layout/arc-background";
import {
  ArcEcosystemHero,
  ArcHomeFooter,
  ArcIntelligenceGrid,
  ArcSystemsShowcase,
} from "@/components/landing/arc-home-sections";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white" data-arc-theme="home">
      <ArcBackground theme="home" />
      <div className="relative">
        <ArcEcosystemHero />
        <ArcIntelligenceGrid />
        <ArcSystemsShowcase />
        <ArcHomeFooter />
      </div>
    </div>
  );
}
