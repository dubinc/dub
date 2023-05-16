import Background from "@/components/shared/background";
import Demo from "#/ui/home/demo";
import Features from "#/ui/home/features";
import Globe from "#/ui/home/globe";
import Hero from "#/ui/home/hero";
import Logos from "#/ui/home/logos";
import Pricing from "#/ui/home/pricing";
import OSS from "#/ui/home/oss";
import Testimonials from "#/ui/home/testimonials";

export default function Home() {
  return (
    <>
      <div className="z-10">
        <Hero />
        <Demo />
        <Logos />
        <Globe />
        <Features />
        {/* @ts-expect-error Async Server Component */}
        <Testimonials />
        <Pricing homePage />
        {/* @ts-expect-error Async Server Component */}
        <OSS />
      </div>
      <Background />
    </>
  );
}
