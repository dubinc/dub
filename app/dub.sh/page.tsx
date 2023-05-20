import Background from "@/components/shared/background";
import Demo from "#/ui/home/demo";
import Features from "#/ui/home/features";
import Hero from "#/ui/home/hero";
import Logos from "#/ui/home/logos";
import Pricing from "#/ui/home/pricing";

export default function Home() {
  return (
    <>
      <div className="z-10">
        <Hero />
        <Demo />
        <Logos />
        <Features />
        <Pricing homePage />
      </div>
      <Background />
    </>
  );
}
